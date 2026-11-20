# Lyric Motion Studio

A lyric-video engine. A track is a project folder (audio, lyrics,
`project.json`, optional components and assets); the studio times every word
on the vocal with Whisper, plays the project in a React + Framer Motion
engine, and renders it frame by frame in headless Chromium, split over many
GitHub Actions machines, from HD to 8K at 30 or 60 fps.

Projects live in their own repository and call this one's workflows at a
fixed version (see [Using it from a projects repository](#using-it-from-a-projects-repository)),
so a track never needs a change in the studio.

## A project

```
tracks/<slug>/
  project.json      the only required file besides lyrics: see below
  lyrics.lrc|txt    one sung line per line; [Verse], [Chorus]… headers set the section
  timing.json       optional manual timing fixes
  youtube.md        optional notes for the upload
  components/*.jsx  optional: the project's own hero, backdrop, layers, whole scene, covers
  assets/           optional: fonts (assets/*.css with @font-face), images, small media
  build/            written by prepare: lyrics.json, audio.json, cover.jpg, media.json, exports
  .media/           git-ignored: audio and footage fetched from R2 or a URL
```

Lines should be written the way they are sung: repeat a chorus where it is
repeated, split very long lines. The lyrics file supplies the text; Whisper
only supplies the timestamps. Text in parentheses, `(Turning to rust, baby!)`,
is a backing vocal: it is kept out of the sung words and given to the
project as the line's `adlibs` (optionally timed: `(<03:18.20>Turning…)`).

## project.json

```json
{
  "$schema": "https://raw.githubusercontent.com/al-writer/lyric-motion-studio/v1.0.0/schema/project.schema.json",
  "studio": "^1",
  "title": "Orange Ticket Stub",
  "artist": "Qubit Quill",
  "language": "en",
  "audio": "r2://projects/orange-ticket-stub/song.mp3",
  "lyrics": { "timing": "whisper", "emphasis": ["^orange ticket stub$"], "pop": ["^hold me up"] },
  "colors": { "text": "#f7ead9", "accent": "#ff8a2a", "accentSoft": "#ffb470" },
  "template": "illustrated",
  "scene": { "hero": { "component": "Ticket.jsx" } },
  "vertical": { "scene": { "lyrics": { "box": { "top": 600 } } } }
}
```

The configuration is layered: engine defaults ← the template's defaults (and
their `wide` / `vertical` block) ← `project.json` ← its `wide` / `vertical`
block. Objects merge key by key, arrays and values replace. Every key and the
defaults are in [`schema/project.schema.json`](schema/project.schema.json)
(editors complete it) and `engine/src/templates/<name>/defaults.js`;
`node tools/check.mjs` validates projects.

| key | |
| --- | --- |
| `studio` | major version the project is made for: `"^1"` |
| `audio` | path in the project, `r2://<key>` (bucket from the R2 secrets) or `https://…`; `audioSha256` is checked when set |
| `media` | `{ "<id>": { "src": …, "sha256": … } }`: footage and photos, same kinds of sources |
| `lyrics` | `file`, `timing` (`whisper` or `lrc`), `whisperModel`, `highlight` (`word` karaoke · `line` · `wipe` · `none`), `lead` / `hold` (s a line is current before its first and after its last word), `emphasis` / `pop` (regexes), `italicSections` |
| `fonts` | `body`, `display`, `hand` families. The defaults (Fraunces, Inter, Space Mono, Caveat) are built in; anything else comes from the project's `assets/*.css` (`node tools/add-font.mjs --track <slug> --font @fontsource/<name>` copies one in) |
| `colors`, `palette` | `text`, `accent`, `accentSoft`, `glow` (`"r,g,b"`), `mote`; per-section backgrounds |
| `template` | `illustrated`, `footage`, `minimal` or `custom` (below) |
| `scene` | the template's options |
| `director` | `components/<file>.js`: `({ t, lines, lyric, dir, cfg, audio }) => ({ pose, lyrics, … })` overrides the direction per frame, for anything the JSON does not cover |
| `thumbnails`, `promo` | cover texts (`tag`, `line`, `highlight`, `t`, `variants`) or `component` for the project's own covers |

Times in the scene (`at`, acts) are seconds or references: `"chorus"` (its
first line), `"chorus#2"`, `"line:12"`, `"bridge-2"`, `"end"`.

### Templates

- **illustrated**: section palette, an optional backdrop component, a hero
  (the cover art or a component) that springs between poses, a lyric wheel or
  single line, audio-reactive glow, rings, motes and spectrum.
  `scene.hero.poses` / `pose` (`default`, `bySection`, `breaks`),
  `scene.lyrics` (`layout`, `box`, `wheel`), `scene.acts`
  (`[{ "from": "bridge", "hero": "center", "lyrics": "caption" }]`),
  `scene.caption`, `scene.reactive`, `scene.spectrum`, `vignette`, `grain`.
- **footage**: video clips and photos behind big lyric lines.
  `scene.background.clips` (`[{ "media", "at", "in", "speed", "loop", "fit", "kenBurns": { "from": { "scale", "x", "y" }, "to": … }, "filters" }]`,
  `transition`: `crossfade` · `fade-black` · `cut`), `scene.filters`
  (`blur`, `brightness`, `contrast`, `saturate`, `hue`, `sepia`, `grade`:
  `teal-orange` · `warm` · `cool` · `mono` · `faded`, `vignette`, `film`:
  grain / flicker / dust / weave, `vhs`: scanlines / chroma / jitter / noise),
  `scene.tint`, `scene.lyrics` (`box`, `size`, `align`, `enter`: `fade` ·
  `rise-blur` · `words-pop` · `typewriter`, `exit`: `fade` · `fade-up` ·
  `blur` · `none`, `previous`: `dim`), `scene.titleCard`.
- **minimal**: the cover art on a blurred copy of itself, title, artist,
  spectrum, optionally one lyric line (`scene.cover`, `scene.title`,
  `scene.lyrics.show`).
- **custom**: `"scene": { "component": "Poster.jsx" }` draws the whole frame;
  the engine adds grain, layers and the fades.

Every template takes `scene.layers`: `[{ "component": "AdLibs.jsx", "z": "above-lyrics", "props": {} }]`
with `z` one of `background`, `behind-hero`, `above-hero`, `above-lyrics`, `top`.

### Components

Project components are plain React (with Framer Motion) and import the
studio's blocks and helpers as `lms`:

```jsx
import { useScene, useLyrics, useAudio, ramp, rng, Spectrum } from 'lms'

export default function Glow() {
  const { t, W, H, cfg } = useScene()        // also: track, vertical, poster, lyric, dir
  const { line, section } = useLyrics()
  const { bass } = useAudio().features(t)    // energy, high, band(i); beats, beatPulse, cumulative
  return <div style={{ position: 'absolute', inset: 0, opacity: 0.2 + 0.6 * bass, background: cfg.colors.accent }} />
}
```

Components also get `{ t, track, cfg, W, H, vertical, section, cur, poster }`
as props. Blocks: `Palette`, `MediaTrack`, `Film`, `VHS`, `Tint`, `Vignette`,
`Grain`, `Fade`, `Motes`, `DotGrid`, `BassGlow`, `BeatRings`, `Spectrum`,
`Hero`, `Cover`, `Wheel`, `SingleLine`, `Caption`, `LineSwap`, `Lyric`,
`TitleCard`, `Words`, `Layers` (see `engine/src/lib/index.js`).

Rules that keep renders right: everything on screen is a pure function of
`t` or a Framer Motion animation (no `Date.now()`, `Math.random()`, CSS
animations or timers; use `rng(seed)`); animations settle within 4 s (chunks
start after a 4 s warm-up); anything loaded per frame goes through
`hold()` / `loadImage()` so the screenshot waits for it.

### Timing fixes

`timing.json` in the project is applied after every alignment (numbers from 1):

```json
{ "lines": { "12": { "shift": -0.2 }, "14": { "start": 41.85, "end": 44.2 } },
  "words": { "12.3": { "t": 41.85, "e": 42.1 } } }
```

Pushing only `timing.json` re-applies the fixes without running Whisper again.

## Media outside git

Songs and footage go to R2 (or any URL) and are fetched into `.media/` when
needed:

```sh
node tools/media.mjs push --track <slug> --file song.flac            # → r2://projects/<slug>/song.flac, project.json updated
node tools/media.mjs push --track <slug> --file city.mp4 --as city   # → media.city
node tools/media.mjs fetch --track <slug>                             # download, check sha256, write build/media.json
```

Video backgrounds are frame-exact: before each chunk the renderer extracts
the source frames it needs with ffmpeg (fitted to the output size, constant
filters baked in) and the engine shows source frame
`floor((in + (t − start) · speed) · fps)` for every render frame, whatever
chunk it is in.

## Output

`--res hd | fhd | 4k | 8k` (1280×720 · 1920×1080 · 3840×2160 · 7680×4320, or
the 9:16 equivalents with `--format vertical`), `--fps 30 | 60`,
`--quality master` (HEVC 10-bit) · `compat` (H.264) · `draft`. The stage is
always 1920×1080 CSS px; the device scale factor sets the real pixels, so
text and SVG are drawn natively at every size, and footage frames and photos
are extracted at the output size. HD is drawn at FHD and downscaled.

## Using it from a projects repository

The project repository holds `tracks/` and short workflows that call this
one's at a fixed version; their jobs run in the studio image of the same
version (`ghcr.io/al-writer/lyric-motion-studio/render:vX.Y.Z`), so nothing
is installed per run:

```yaml
jobs:
  render:
    uses: al-writer/lyric-motion-studio/.github/workflows/render.yml@v1.0.0 # x-release-please-version
    with:
      track: ${{ inputs.track }}
      res: ${{ inputs.res }}
    secrets: inherit
    permissions: { contents: write, actions: write, packages: read }
```

| workflow | |
| --- | --- |
| `prepare.yml` | on pushes to projects: Whisper / LRC timing, audio analysis, media probe; commits `build/` back. Only what changed is redone (`tools/changed.mjs`): a colour change runs nothing, `timing.json` only re-applies fixes |
| `render.yml` | shards over up to 20 machines per format, merges, puts the videos into a **draft release** (and R2 / Google Drive when configured), removes every chunk afterwards, even when a job fails |
| `deliver.yml` | puts a render run's video artifacts into a draft release again |
| `media.yml` | moves songs and footage that are not in R2 yet (files or URLs) to R2 and commits the new `project.json` |

Secrets in the project repository: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (chunks, videos and media in R2), and
optionally `RCLONE_CONF` (Google Drive, variable `DRIVE_DEST`). Without R2,
chunks and videos travel as artifacts, deleted once used. Release assets
are limited to 2 GiB; larger videos (long 8K) stay in R2.

To try a studio branch, pass `image: ghcr.io/al-writer/lyric-motion-studio/render:<branch>`
(built by `image.yml` on every push that touches the studio) and use the
branch in `uses:`.

## Locally

Needs Node 22, Python 3.10+ and ffmpeg.

```sh
npm ci && npx playwright install chromium
pip install -r requirements.txt

export LMS_PROJECTS=../qubit-quill-tracks/tracks       # default: ./tracks
python3 tools/prepare.py <slug>                        # timings + audio analysis
npm run dev                                            # preview with sound; ?track=<slug>&format=vertical&debug
node tools/render.mjs --track <slug> --stills 8,66     # PNG frames into out/
node tools/render.mjs --track <slug> --format vertical --res fhd --fps 30 --range 48,92
node tools/render.mjs --track <slug> --thumbnail       # covers
node tools/compare.mjs <reference-dir> out             # SSIM against earlier renders
```

`?debug` outlines every box of the scene, the hero poses and the Shorts UI
zones. Renders are cut into chunks kept on disk, so an interrupted render
resumes where it stopped.

## Developing the studio

- `engine/src/lib` (hooks, config, lyric state, timeline, barrier),
  `engine/src/blocks`, `engine/src/templates`, `engine/vite/plugin.js`
  (projects folder → virtual module + `/p/<slug>/` files).
- `tools/`: `prepare.py`, `render.mjs`, `frames.mjs`, `merge.mjs`,
  `media.mjs`, `r2.mjs`, `check.mjs`, `changed.mjs`, `release.mjs`,
  `compare.mjs`, `add-font.mjs`, `youtube.mjs`.
- `npm test` (vitest + pytest), `node tools/check.mjs`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  (checked by CI, `.commitlintrc.json` lists the scopes). release-please turns
  them into a release pull request; merging it tags the version, writes
  `CHANGELOG.md` and builds the image. A `feat!` / `BREAKING CHANGE` makes a
  new major version.
- `tracks/` holds the examples: `orange-ticket-stub` (illustrated, with its
  own hero) and `footage-demo` (footage with synthetic clips).
