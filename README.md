# Lyric Motion Studio

Drop in a track and its lyrics, get a word-synced animated lyric video.
Scenes are React + Framer Motion, words are timed on the actual vocal with
Whisper, visuals react to the music, and rendering is split over many GitHub
Actions machines, up to 4K / 60 fps.

## Adding a track

Create `tracks/<slug>/` with:

| file | |
| --- | --- |
| `song.mp3` (or `.wav`, `.m4a`, `.flac`) | the track |
| `lyrics.txt` or `lyrics.lrc` | one sung line per line; `[Verse 1]`, `[Chorus]`… headers (Suno style) set the section |
| `scene.json` | the look: see below |
| `scene/*.jsx` (optional) | the track's own hero object, e.g. `tracks/orange-ticket-stub/scene/Ticket.jsx` |

Push it. The **Prepare track** workflow places every word on the vocal and
commits `tracks/<slug>/build/` (`lyrics.json`, `audio.json`, `cover.jpg`, and
`lyrics.lrc` / `lyrics.srt` exports). Check the timings, then run **Render
video** from the Actions tab.

Lines should be written the way they are sung: repeat a chorus where it is
repeated, split very long lines. The lyrics file supplies the text; Whisper
only supplies the timestamps. To trust an LRC file's own timestamps instead,
set `"timing": "lrc"`.

## scene.json

```json
{
  "title": "Orange Ticket Stub",
  "artist": "qubit_quill",
  "language": "en",
  "layout": "wheel",
  "hero": { "type": "component", "file": "Ticket.jsx", "size": [900, 450] },
  "colors": { "text": "#f7ead9", "accent": "#ff8a2a", "accentSoft": "#ffb470" },
  "emphasis": ["^orange ticket stub$"],
  "pop": ["^hold me up"],
  "italicSections": ["bridge"],
  "reactive": { "dots": true, "glow": true, "tilt": true, "motes": true, "spectrum": true, "rings": ["chorus"] }
}
```

| key | |
| --- | --- |
| `layout` | `wheel` (picker-style column of lines) or `single` (one line at a time) |
| `hero` | `{ "type": "cover" }` (art embedded in the audio file, default), `{ "type": "component", "file": "X.jsx", "size": [w, h] }`, or `{ "type": "none" }` |
| `emphasis` / `pop` | regexes over a line's text: emphasised lines use the display font and accent colour; pop lines spring word by word |
| `palette` | per-section background: `{ "chorus": { "base": "#250d12", "glow": "rgba(…)", "glow2": "rgba(…)" } }` for `intro`, `verse`, `pre`, `chorus`, `bridge`, `outro` |
| `fonts` | `body`, `display`, `hand`: bundled are Fraunces Variable, Inter Variable, Space Mono, Caveat |
| `language`, `whisperModel`, `timing` | alignment settings (`en` uses `small.en`, other languages `small`) |
| `fadeIn`, `fadeOut` | seconds from / to black |

## Rendering

**On GitHub.** Actions → *Render video* → pick track, aspect (`wide` 16:9,
`vertical` 9:16 or both), resolution, fps and quality:

- `master`: HEVC 10-bit, CRF 15: best picture, for YouTube and archiving
- `compat`: H.264 high bitrate: plays everywhere
- `draft`: fast H.264 preview; combine with a `range` such as `48,92`

Each format is split over up to 20 machines that render in parallel; a merge
job joins the pieces with the audio.

Where the video goes:

- **Cloudflare R2** (recommended). Repository secrets `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Chunks and the
  final video stay in the private bucket (`renders/<slug>/…`), and the run
  summary gets a download link valid for 7 days.
- **Google Drive**. Secret `RCLONE_CONF` holding an rclone config with a
  remote named `gdrive`; optional repository variable `DRIVE_DEST`
  (default `gdrive:Lyric Motion Studio`).
- Neither: the video is a workflow artifact, kept for 1 day.

**Locally.** Needs Node 20+, Python 3.10+ and ffmpeg.

```sh
npm ci && npx playwright install chromium
pip install -r requirements.txt

python3 tools/prepare.py orange-ticket-stub          # timings + audio analysis
npm run dev                                          # live preview with sound: open the printed URL
npm run stills -- 8,66 --track orange-ticket-stub    # PNG frames into out/
npm run render -- --track orange-ticket-stub --format vertical --res 1080p --fps 30 --range 48,92
```

Renders are cut into chunks kept on disk, so an interrupted render resumes
where it stopped.

## How it works

- `engine/`: the player. One build serves every track:
  `?track=<slug>&format=wide|vertical`.
- `tools/prepare.py`: lyrics parsing, Whisper alignment, audio analysis
  (32-band spectrum, energy, bass, highs, kicks at 30 fps), exports.
- `tools/render.mjs`: opens the engine in headless Chromium with a fake
  clock, steps it frame by frame, screenshots, and pipes frames to ffmpeg.
  4K is the same 1920×1080 stage at device scale factor 2, so text stays
  vector-sharp.
- `tools/merge.mjs`: checks that the chunks cover the whole range and joins
  them with the audio.
- `tools/r2.mjs`: tiny R2 client (upload, download, delete, presigned
  link) used by the workflow; works locally with the same environment
  variables.
