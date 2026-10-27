"""Prepare a track for rendering.

    python3 tools/prepare.py <slug> [--timing whisper|lrc] [--model small.en] [--skip-align]

Reads tracks/<slug>/song.(mp3|wav|m4a|flac) and lyrics.(lrc|txt) and writes
tracks/<slug>/build/:
    lyrics.json  word-timed lines the engine plays
    audio.json   per-frame spectrum / energy / bass / highs and kick times
    cover.jpg    cover art embedded in the audio file, if any
    lyrics.lrc   enhanced LRC (word tags) and lyrics.srt, for distributors

Timing: by default every word is placed by Whisper on the actual vocal and
the text comes from the lyrics file (Whisper only supplies timestamps). An
LRC file's own timestamps are used as-is with --timing lrc or
"timing": "lrc" in scene.json.
"""
import argparse, base64, difflib, json, re, subprocess, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR, FPS, BANDS = 22050, 30, 32

SECTION_ALIASES = [
    ("pre", r"pre[- ]?chorus|build"),
    ("chorus", r"chorus|hook|refrain"),
    ("bridge", r"bridge|middle 8"),
    ("outro", r"outro|ending|end"),
    ("intro", r"intro"),
    ("verse", r"verse|rap"),
]
LRC_TIME = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\]")

LRC_META = re.compile(r"^\[(ar|ti|al|au|by|length|offset|re|ve|#):", re.I)


def section_of(header):
    h = header.lower()
    for key, pattern in SECTION_ALIASES:
        if re.search(pattern, h):
            return key
    return "verse"


def parse_lyrics(path):
    """Lines with section, words and (for LRC) optional timestamps."""
    lines, section = [], "verse"
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if not s or LRC_META.match(s):
            continue
        head = re.fullmatch(r"\[([^\]\d][^\]]*)\]|#\s*(\w[\w -]*)", s)
        if head:
            section = section_of(head.group(1) or head.group(2))
            continue
        m = LRC_TIME.match(s)
        t = int(m.group(1)) * 60 + float(m.group(2)) if m else None
        s = LRC_TIME.sub("", s).strip()
        # enhanced LRC: "<mm:ss.xx>word" tags give each word its own start
        words, wt, pending = [], [], None
        for tag_m, tag_s, word in re.findall(r"<(\d+):(\d+(?:\.\d+)?)>|([^\s<]+)", s):
            if word:
                words.append(word)
                wt.append(pending)
                pending = None
            else:
                pending = int(tag_m) * 60 + float(tag_s)
        if words:
            lines.append({"section": section, "words": [{"w": w} for w in words], "lrc": t, "lrcWords": wt})
    return lines


def decode_audio(path, sr):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.float32)


def norm_word(s):
    return re.sub(r"[^\w']", "", s.lower())


def align_whisper(lines, audio_path, model_name, language):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(decode_audio(audio_path, 16000), language=language, word_timestamps=True, beam_size=5)
    heard = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
    print(f"whisper heard {len(heard)} words")

    flat = [(i, j) for i, l in enumerate(lines) for j in range(len(l["words"]))]
    a = [norm_word(lines[i]["words"][j]["w"]) for i, j in flat]
    b = [norm_word(w[2]) for w in heard]
    T, E = [None] * len(a), [None] * len(a)
    for op, a1, a2, b1, b2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal" or (op == "replace" and a2 - a1 == b2 - b1):
            for k in range(a2 - a1):
                T[a1 + k], E[a1 + k] = heard[b1 + k][0], heard[b1 + k][1]
    known = [k for k in range(len(T)) if T[k] is not None]
    if not known:
        sys.exit("whisper matched no words; check the lyrics language/text")
    for k in range(len(T)):  # interpolate words Whisper did not match
        if T[k] is None:
            p = max((x for x in known if x < k), default=None)
            n = min((x for x in known if x > k), default=None)
            if p is None:
                T[k] = T[n] - 0.3 * (n - k)
            elif n is None:
                T[k] = E[p] + 0.3 * (k - p)
            else:
                T[k] = E[p] + (T[n] - E[p]) * (k - p) / (n - p)
            E[k] = T[k] + 0.25
    for idx, (i, j) in enumerate(flat):
        lines[i]["words"][j].update(t=round(T[idx], 2), e=round(E[idx], 2))
    print(f"matched {len(known)}/{len(T)} words")


def align_lrc(lines, duration):
    if any(l["lrc"] is None for l in lines):
        sys.exit("--timing lrc needs a [mm:ss.xx] timestamp on every line")
    for n, l in enumerate(lines):
        end = lines[n + 1]["lrc"] if n + 1 < len(lines) else min(duration, l["lrc"] + 4)
        k = len(l["words"])
        for j, w in enumerate(l["words"]):
            t = l["lrcWords"][j] if l["lrcWords"][j] is not None else l["lrc"] + (end - l["lrc"]) * 0.85 * j / k
            w.update(t=round(t, 2), e=round(t + (end - l["lrc"]) * 0.85 / k, 2))


def analyze(audio_path):
    hop, n = SR // FPS, 4096  # one hop per video frame
    x = decode_audio(audio_path, SR)
    frames = int(np.ceil(len(x) / hop))
    x = np.pad(x, (n // 2, n))
    win = np.hanning(n).astype(np.float32)
    spec = np.abs(np.fft.rfft(np.stack([x[i * hop:i * hop + n] * win for i in range(frames)]), axis=1))
    freqs = np.fft.rfftfreq(n, 1 / SR)

    def band(lo, hi):
        m = (freqs >= lo) & (freqs < hi)
        if not m.any():  # narrower than one FFT bin: take the nearest bin
            d = np.abs(freqs - np.sqrt(lo * hi))
            m = d == d.min()
        return spec[:, m].mean(axis=1)

    def norm(v, pct=98):
        return np.clip(v / (np.percentile(v, pct) + 1e-9), 0, 1)

    def spread(v, lo=15, hi=99):  # each band's own range onto 0..1, quiet parts stay calm
        a, b = np.percentile(v, [lo, hi])
        return np.clip((v - a) / (b - a + 1e-9), 0, 1) ** 1.6

    def smooth(v, attack=0.6, release=0.12):
        out, s = np.empty_like(v), 0.0
        for i, a in enumerate(v):
            s += (a - s) * (attack if a > s else release)
            out[i] = s
        return out

    edges = np.geomspace(45, 11000, BANDS + 1)
    bands = np.stack([smooth(spread(np.log1p(band(lo, hi) * 50)), 0.65, 0.18) for lo, hi in zip(edges, edges[1:])], axis=1)
    low = band(40, 150)
    energy = smooth(norm(np.sqrt((spec ** 2).mean(axis=1))), 0.5, 0.06)
    bass = smooth(norm(low), 0.7, 0.15)
    high = smooth(norm(band(4000, 11000)), 0.5, 0.1)

    # kick detection: peaks of the positive log-flux in the low band
    flux = np.maximum(0, np.diff(np.log1p(low * 100), prepend=0))
    thr = flux.mean() + 1.6 * flux.std()
    beats, last = [], -1e9
    for i in range(1, frames - 1):
        if flux[i] > thr and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1] and i - last > 0.28 * FPS:
            beats.append([round(i / FPS, 3), round(float(min(1, flux[i] / (thr * 2))), 2)])
            last = i

    b64 = lambda a: base64.b64encode((np.clip(a, 0, 1) * 255).astype(np.uint8).tobytes()).decode()
    duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio_path)],
                                    capture_output=True, text=True, check=True).stdout)
    return {"fps": FPS, "frames": frames, "duration": round(duration, 3), "bands": BANDS, "spectrum": b64(bands),
            "energy": b64(energy), "bass": b64(bass), "high": b64(high), "beats": beats}


def stamp(t, sep="."):
    m, s = divmod(t, 60)
    return f"{int(m):02d}:{s:05.2f}" if sep == "." else f"{int(t // 3600):02d}:{int(m % 60):02d}:{s:06.3f}".replace(".", ",")


def export(lines, out):
    lrc = [f"[{stamp(l['t'])}] " + " ".join(f"<{stamp(w['t'])}>{w['w']}" for w in l["words"]) for l in lines]
    (out / "lyrics.lrc").write_text("\n".join(lrc) + "\n", encoding="utf-8")
    srt = []
    for n, l in enumerate(lines, 1):
        end = min(l["e"] + 0.5, lines[n]["t"] - 0.05) if n < len(lines) else l["e"] + 1
        srt.append(f"{n}\n{stamp(l['t'], ',')} --> {stamp(end, ',')}\n{' '.join(w['w'] for w in l['words'])}\n")
    (out / "lyrics.srt").write_text("\n".join(srt), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--timing", choices=["whisper", "lrc"])
    ap.add_argument("--model")
    ap.add_argument("--skip-align", action="store_true", help="only re-run the audio analysis")
    args = ap.parse_args()

    tdir = ROOT / "tracks" / args.slug
    scene = json.loads((tdir / "scene.json").read_text()) if (tdir / "scene.json").exists() else {}
    song = next((p for ext in ("mp3", "wav", "m4a", "flac") if (p := tdir / f"song.{ext}").exists()), None)
    lyr = next((p for ext in ("lrc", "txt") if (p := tdir / f"lyrics.{ext}").exists()), None)
    if not song or not lyr:
        sys.exit(f"{tdir} needs song.(mp3|wav|m4a|flac) and lyrics.(lrc|txt)")
    out = tdir / "build"
    out.mkdir(exist_ok=True)

    print("analyzing audio…")
    audio = analyze(song)
    (out / "audio.json").write_text(json.dumps(audio))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(song), "-an", "-c:v", "mjpeg", "-frames:v", "1", str(out / "cover.jpg")],
                   capture_output=True)
    if args.skip_align:
        return

    lines = parse_lyrics(lyr)
    language = scene.get("language", "en")
    timing = args.timing or scene.get("timing", "whisper")
    if timing == "lrc":
        align_lrc(lines, audio["duration"])
    else:
        model = args.model or scene.get("whisperModel") or ("small.en" if language == "en" else "small")
        print(f"aligning with whisper ({model})…")
        align_whisper(lines, song, model, language)
    for l in lines:
        l["t"], l["e"] = l["words"][0]["t"], l["words"][-1]["e"]
        del l["lrc"], l["lrcWords"]
    (out / "lyrics.json").write_text(json.dumps({"timing": timing, "lines": lines}, ensure_ascii=False, indent=1))
    export(lines, out)
    print(f"wrote {out.relative_to(ROOT)}: {len(lines)} lines, {audio['duration']:.1f}s, {len(audio['beats'])} kicks")


if __name__ == "__main__":
    main()
