# Lyric Motion Studio — notes for Claude

Lyric-video generator: `tracks/<slug>/` (audio, lyrics, `scene.json`, optional
`scene/*.jsx` hero) → `tools/prepare.py` (Whisper word timing + audio
analysis into `build/`) → `engine/` (React + Framer Motion player) →
`tools/render.mjs` (Playwright fake clock, frame-by-frame screenshots →
ffmpeg, resumable chunks) → `tools/merge.mjs`. GitHub workflows:
`prepare.yml` (on push to a track, commits `build/`) and `render.yml`
(manual, sharded over up to 20 runners, output to R2 / Drive / artifact).
Jobs run in `ghcr.io/<repo>/render` built by `image.yml` from
`docker/render.Dockerfile`; bump its Playwright tag together with the
`playwright` npm version (image.yml fails the build if they differ).

## Rules that keep renders correct

- Everything on screen must be a pure function of `t` (the clock) or a
  Framer Motion animation driven by rAF. No `Date.now()`, `Math.random()`,
  CSS animations/transitions or timers: the renderer fakes rAF and
  `performance.now` only. Use `rng(seed)` from `engine/src/clock.js`.
- Framer Motion's WAAPI path is disabled in render mode
  (`delete Element.prototype.animate`); don't rely on it.
- Stage sizes live in `engine/src/format.js` (CSS px: 1920×1080 or
  1080×1920). 4K = device scale factor 2; never hard-code output pixels.
- Chunks are rendered independently after a 4 s warm-up, so any animation
  must settle within 4 s or chunk seams will show.
- Lyrics text comes from the track's lyrics file; Whisper only supplies
  timestamps. Don't "correct" lyrics from what Whisper heard.

## Checking a change

```sh
npx vite build
node tools/render.mjs --track orange-ticket-stub --stills 8,66            # look at out/*.png
node tools/render.mjs --track orange-ticket-stub --format vertical --stills 66
node tools/render.mjs --track orange-ticket-stub --range 64,66             # short clip end to end
```

Rendering is slow (~1.6 s per 4K frame on a 4-core runner): verify with
stills and short ranges, not full songs.
