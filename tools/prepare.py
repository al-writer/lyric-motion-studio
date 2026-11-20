"""Prepare a project (track) for rendering.

    python3 tools/prepare.py <slug> [--projects tracks] [--timing whisper|lrc] [--model small]
                             [--skip-align] [--overrides-only]

Reads the project's project.json, its audio ("audio": a path in the project,
or r2://… / https://… fetched into .media/ by tools/media.mjs) and lyrics
(lyrics.file, else lyrics.lrc / lyrics.txt) and writes build/:
    lyrics.json  word-timed lines the engine plays (plus "adlibs": backing vocals
                 written in parentheses, which are kept out of the sung words)
    audio.json   per-frame spectrum / energy / bass / highs and kick times
    cover.jpg    cover art embedded in the audio file, if any
    lyrics.lrc   enhanced LRC (word tags) and lyrics.srt, for distributors
    whisper.lrc  what Whisper heard (to check the lyrics file against; never used as text)
    aligned.json the alignment before manual fixes (see below)

Timing: by default every word is placed by Whisper on the actual vocal and
the text comes from the lyrics file (Whisper only supplies timestamps). An
LRC file's own timestamps are used as-is with --timing lrc or
"lyrics": { "timing": "lrc" } in project.json.

Manual fixes: <project>/timing.json, applied after the alignment (and kept
when the song is prepared again). Line and word numbers start at 1:
    { "lines": { "12": { "shift": -0.2 }, "14": { "start": 41.85, "end": 44.2 } },
      "words": { "12.3": { "t": 41.85, "e": 42.1 } } }
--overrides-only re-applies it to build/aligned.json without aligning again.
"""
import argparse, base64, difflib, json, os, re, subprocess, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR, FPS, BANDS = 22050, 30, 32
LONG_FIRST = 1.6  # s; see align_whisper
MAX_WORD_GAP = 4.0  # s; see align_whisper

SECTION_ALIASES = [
    ("pre", r"pre[- ]?chorus|build"),
    ("chorus", r"chorus|hook|refrain"),
    ("bridge", r"bridge|middle 8"),
    ("outro", r"outro|ending|end"),
    ("intro", r"intro"),
    ("verse", r"verse|rap"),
]
LRC_TIME = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\]")
# backing vocals / ad-libs: "(Turning to rust, baby!)" anywhere in a line, optionally
# timed with an enhanced-LRC tag "(<03:18.20>Turning to rust, baby!)". They are not
# part of the sung line: Whisper never sees them, a project component shows them.
ADLIB = re.compile(r"\(\s*(?:<(\d+):(\d+(?:\.\d+)?)>)?\s*([^)]+?)\s*\)")
ADLIB_DELAY, ADLIB_LEN = 0.4, 2.6  # s after the line's last word starts; how long it stays

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
        adlibs = [{"text": a, "at": int(am) * 60 + float(asec) if am else None} for am, asec, a in ADLIB.findall(s)]
        s = ADLIB.sub("", s).strip()
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
            lines.append({"section": section, "words": [{"w": w} for w in words], "lrc": t, "lrcWords": wt, "lrcEnd": None, "adlibs": adlibs})
        elif t is not None and lines:  # a bare "[mm:ss.xx]" ends the previous line (sung lines before a break)
            lines[-1]["lrcEnd"] = t
    return lines


def decode_audio(path, sr):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.float32)


def norm_word(s):
    return re.sub(r"[^\w']", "", s.lower())


def match_words(a, b):
    """Monotonic word alignment of the lyrics (a) against what Whisper heard (b):
    a global alignment (Needleman-Wunsch) that rewards same or similar-sounding
    words and lets either side skip words cheaply. Unlike longest-block matching
    it cannot lock one repeated chorus onto another and lose everything after it.
    Returns (lyrics index, heard index) pairs, both increasing."""
    MATCH, FUZZY, SUB, GAP = 2.0, 0.6, -0.7, -0.5
    sims = {}

    def score(x, y):
        if (x, y) not in sims:
            r = 1.0 if x == y else difflib.SequenceMatcher(None, x, y).ratio()
            sims[x, y] = MATCH if r >= 0.8 else FUZZY if r >= 0.5 else SUB
        return sims[x, y]

    n, m = len(a), len(b)
    D = np.zeros((n + 1, m + 1))
    D[:, 0] = GAP * np.arange(n + 1)
    D[0, :] = GAP * np.arange(m + 1)
    back = np.zeros((n + 1, m + 1), np.int8)  # 0 diagonal, 1 skip lyric word, 2 skip heard word
    for i in range(1, n + 1):
        Di, Dp, x = D[i], D[i - 1], a[i - 1]
        for j in range(1, m + 1):
            d, u, l = Dp[j - 1] + score(x, b[j - 1]), Dp[j] + GAP, Di[j - 1] + GAP
            if d >= u and d >= l:
                Di[j] = d
            elif u >= l:
                Di[j], back[i, j] = u, 1
            else:
                Di[j], back[i, j] = l, 2
        back[i, 0] = 1
    back[0, 1:] = 2
    pairs, i, j = [], n, m
    while i > 0 or j > 0:
        k = back[i, j]
        if k == 0:
            pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif k == 1:
            i -= 1
        else:
            j -= 1
    return pairs[::-1]


def align_whisper(lines, audio_path, model_name, language):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(decode_audio(audio_path, 16000), language=language, word_timestamps=True, beam_size=5)
    segs = list(segs)
    heard = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
    print(f"whisper heard {len(heard)} words")

    flat = [(i, j) for i, l in enumerate(lines) for j in range(len(l["words"]))]
    a = [norm_word(lines[i]["words"][j]["w"]) for i, j in flat]
    b = [norm_word(w[2]) for w in heard]
    T, E = [None] * len(a), [None] * len(a)
    for i, j in match_words(a, b):
        T[i], E[i] = heard[j][0], heard[j][1]
    # Words inside one line are sung close together; a match far after the previous
    # word of its line is a Whisper hallucination ("Thanks for watching!" in the
    # silence after the song) and is dropped, to be interpolated below.
    last = None  # last kept word of the current line
    for k in range(len(T)):
        if flat[k][1] == 0:
            last = None
        if T[k] is None:
            continue
        if last is not None and T[k] - E[last] > MAX_WORD_GAP:
            T[k] = E[k] = None
        else:
            last = k
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
    for k in range(len(T)):
        # Whisper stretches a segment's first word back over the instrumental before
        # it ("Champagne" from 12 s when it is sung at 20.5 s): a line never opens
        # with a word longer than LONG_FIRST, the start moves up to its end
        if k in known and flat[k][1] == 0 and E[k] - T[k] > LONG_FIRST:
            T[k] = E[k] - 0.6
    for idx, (i, j) in enumerate(flat):
        lines[i]["words"][j].update(t=round(T[idx], 2), e=round(E[idx], 2))
    print(f"matched {len(known)}/{len(T)} words")
    place_unheard_lines(lines, flat, set(known))
    # what Whisper actually heard, line by line, to check the lyrics file against (never used as text)
    return "".join(f"[{stamp(s.start)}] {s.text.strip()}\n" for s in segs), f"{len(known)}/{len(T)}"


def place_unheard_lines(lines, flat, known):
    """Lines Whisper heard none of (often the first one over a quiet intro) get only
    interpolated times, squeezed against their neighbours. If the lyrics file is an
    LRC, put such lines at their own timestamp, shifted by how far the LRC runs
    ahead of or behind the vocal on the lines Whisper did hear."""
    words_of = {}
    for idx, (i, _) in enumerate(flat):
        words_of.setdefault(i, []).append(idx)
    heard = {i: any(k in known for k in ks) for i, ks in words_of.items()}
    offsets = [lines[i]["words"][0]["t"] - lines[i]["lrc"] for i, ks in words_of.items()
               if lines[i]["lrc"] is not None and ks[0] in known]
    if not offsets:
        return
    off = float(np.median(offsets))
    for i in sorted(words_of, reverse=True):  # backwards, so the next line is already final
        line = lines[i]
        if heard[i] or line["lrc"] is None:
            continue
        start = line["lrc"] + off
        prev_end = lines[i - 1]["words"][-1]["e"] if i > 0 and heard[i - 1] else 0
        nxt = lines[i + 1]["words"][0]["t"] if i + 1 < len(lines) else start + 4
        if not prev_end <= start < nxt - 0.3:
            continue
        span = min(nxt - start, 6) * 0.85
        n = len(line["words"])
        for j, w in enumerate(line["words"]):
            w.update(t=round(start + span * j / n, 2), e=round(start + span * (j + 1) / n, 2))
        print(f"line {i + 1} not heard by whisper: placed at its LRC time {start:.2f}s (offset {off:+.2f}s)")


VOWELS = re.compile(r"[aeiouyаәеёиоөуұүыіэюяáéíóúäöü]", re.I)


def syllables(word):
    return max(1, len(VOWELS.findall(word)))


def align_lrc(lines, duration):
    """Line timestamps from the LRC; words without their own <mm:ss> tag are
    spread over the line by syllable count. A line ends at its bare end
    marker, else just before the next line."""
    if any(l["lrc"] is None for l in lines):
        sys.exit("--timing lrc needs a [mm:ss.xx] timestamp on every line")
    for n, l in enumerate(lines):
        nxt = lines[n + 1]["lrc"] if n + 1 < len(lines) else min(duration, l["lrc"] + 4)
        end = l["lrcEnd"] if l["lrcEnd"] is not None else l["lrc"] + (nxt - l["lrc"]) * 0.92
        span = end - l["lrc"]
        weights = [syllables(w["w"]) for w in l["words"]]
        total, acc = sum(weights), 0
        starts = []
        for j, w in enumerate(l["words"]):
            starts.append(l["lrcWords"][j] if l["lrcWords"][j] is not None else l["lrc"] + span * acc / total)
            acc += weights[j]
        for j, w in enumerate(l["words"]):
            e = starts[j + 1] if j + 1 < len(starts) else end
            w.update(t=round(starts[j], 2), e=round(max(starts[j] + 0.08, e - 0.02), 2))


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


def apply_overrides(lines, fixes):
    """Manual timing fixes from the project's timing.json (1-based numbers)."""
    for key, f in (fixes.get("lines") or {}).items():
        i = int(key) - 1
        if not 0 <= i < len(lines):
            sys.exit(f"timing.json: there is no line {key}")
        words = lines[i]["words"]
        if "shift" in f:
            for w in words:
                w["t"], w["e"] = round(w["t"] + f["shift"], 2), round(w["e"] + f["shift"], 2)
        if "start" in f or "end" in f:
            a, b = words[0]["t"], words[-1]["e"]
            na, nb = f.get("start", a), f.get("end", b)
            k = (nb - na) / max(1e-6, b - a)
            for w in words:
                w["t"], w["e"] = round(na + (w["t"] - a) * k, 2), round(na + (w["e"] - a) * k, 2)
    for key, f in (fixes.get("words") or {}).items():
        li, wi = (int(x) - 1 for x in key.split("."))
        try:
            w = lines[li]["words"][wi]
        except IndexError:
            sys.exit(f"timing.json: there is no word {key}")
        w.update({k: round(v, 2) for k, v in f.items() if k in ("t", "e")})
    for l in lines:
        l["t"], l["e"] = l["words"][0]["t"], l["words"][-1]["e"]
    return lines


def finish(lines, timing, tdir, out):
    """Manual fixes, then lyrics.json and the distributor exports."""
    fixes_path = tdir / "timing.json"
    fixes = json.loads(fixes_path.read_text()) if fixes_path.exists() else {}
    lines = apply_overrides(json.loads(json.dumps(lines)), fixes)
    (out / "lyrics.json").write_text(json.dumps({"timing": timing, "lines": lines}, ensure_ascii=False, indent=1))
    export(lines, out)
    if fixes:
        print(f"applied {len(fixes.get('lines') or {})} line and {len(fixes.get('words') or {})} word fixes from timing.json")
    return lines


def audio_file(tdir, project, projects):
    """Local copy of the project's audio; remote sources are fetched first."""
    src = project.get("audio")
    if not src:
        sys.exit(f"{tdir}/project.json has no \"audio\"")
    if re.match(r"^(r2|https?)://", src):
        ext = (re.search(r"\.[a-z0-9]{2,5}$", src.split("?")[0], re.I) or [""])[0].lower()
        path = tdir / ".media" / f"audio{ext}"
        if not path.exists():
            subprocess.run(["node", str(ROOT / "tools" / "media.mjs"), "fetch", "--projects", str(projects), "--track", tdir.name, "--only", "audio"], check=True)
        return path
    path = tdir / src
    if not path.exists():
        sys.exit(f"{path} does not exist")
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--projects", default=os.environ.get("LMS_PROJECTS", "tracks"))
    ap.add_argument("--timing", choices=["whisper", "lrc"])
    ap.add_argument("--model")
    ap.add_argument("--skip-align", action="store_true", help="only re-run the audio analysis")
    ap.add_argument("--overrides-only", action="store_true", help="only re-apply timing.json to build/aligned.json")
    args = ap.parse_args()

    projects = Path(args.projects).resolve()
    tdir = projects / args.slug
    if not (tdir / "project.json").exists():
        sys.exit(f"no project.json in {tdir}")
    project = json.loads((tdir / "project.json").read_text())
    ly = project.get("lyrics") or {}
    out = tdir / "build"
    out.mkdir(exist_ok=True)

    if args.overrides_only:
        saved = json.loads((out / "aligned.json").read_text())
        finish(saved["lines"], saved["timing"], tdir, out)
        print(f"re-applied timing.json to {len(saved['lines'])} lines")
        return

    song = audio_file(tdir, project, projects)
    lyr = tdir / ly["file"] if ly.get("file") else next((p for ext in ("lrc", "txt") if (p := tdir / f"lyrics.{ext}").exists()), None)
    if not lyr or not lyr.exists():
        sys.exit(f"{tdir} needs lyrics.(lrc|txt) or \"lyrics\": {{ \"file\": … }}")

    print("analyzing audio…")
    audio = analyze(song)
    (out / "audio.json").write_text(json.dumps(audio))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(song), "-an", "-c:v", "mjpeg", "-frames:v", "1", str(out / "cover.jpg")],
                   capture_output=True)
    if args.skip_align:
        return

    lines = parse_lyrics(lyr)
    language = project.get("language", "en")
    timing = args.timing or ly.get("timing", "whisper")
    if timing == "lrc":
        align_lrc(lines, audio["duration"])
    else:
        model = args.model or ly.get("whisperModel") or ("small.en" if language == "en" else "small")
        print(f"aligning with whisper ({model})…")
        heard, matched = align_whisper(lines, song, model, language)
        (out / "whisper.lrc").write_text(f"[#: whisper {model}, matched {matched} words of the lyrics file]\n" + heard, encoding="utf-8")
    for l in lines:
        l["t"], l["e"] = l["words"][0]["t"], l["words"][-1]["e"]
        del l["lrc"], l["lrcWords"], l["lrcEnd"]
        adlibs = l.pop("adlibs")
        if adlibs:
            for n, a in enumerate(adlibs):
                t = a["at"] if a["at"] is not None else l["words"][-1]["t"] + ADLIB_DELAY + n * ADLIB_LEN
                a.update(t=round(t, 2), e=round(t + ADLIB_LEN, 2))
                del a["at"]
            l["adlibs"] = adlibs
    # the alignment as it came out, so timing.json fixes can be re-applied without aligning again
    (out / "aligned.json").write_text(json.dumps({"timing": timing, "lines": lines}, ensure_ascii=False))
    lines = finish(lines, timing, tdir, out)
    print(f"wrote {out}: {len(lines)} lines, {audio['duration']:.1f}s, {len(audio['beats'])} kicks")


if __name__ == "__main__":
    main()
