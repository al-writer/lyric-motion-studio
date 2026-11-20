# Lyric Motion Studio — notes for Claude

The studio is an engine and tools, versioned with tags (vX.Y.Z). Tracks live
in a projects repository (al-writer/qubit-quill-tracks), each a folder with
`project.json`, lyrics, `components/`, `assets/` and `build/`. Pipeline:
`tools/prepare.py` (Whisper word timing + audio analysis into `build/`) →
`engine/` (React + Framer Motion; templates built from blocks) →
`tools/render.mjs` (Playwright fake clock, frame-by-frame screenshots →
ffmpeg, resumable chunks) → `tools/merge.mjs`. The reusable workflows
(`prepare.yml`, `render.yml`, `deliver.yml`) run in the studio image
`ghcr.io/al-writer/lyric-motion-studio/render:<version>` built from
`docker/render.Dockerfile`; bump its Playwright tag together with the
`playwright` npm version (image.yml fails the build if they differ).

## The goal: tracks never need engine changes

- Anything a track needs is a `project.json` key, a project component
  (`import … from 'lms'`), a layer, a director, or an asset of the project.
  If a track seems to need an engine edit, add a general option or block
  instead, with a default that keeps every existing project unchanged.
- Never hard-code positions, poses or timings in a template: put them in its
  `defaults.js` (with a `vertical` block) and in `schema/project.schema.json`.

## Rules that keep renders correct

- Everything on screen must be a pure function of `t` (the clock) or a
  Framer Motion animation driven by rAF. No `Date.now()`, `Math.random()`,
  CSS animations/transitions or timers: the renderer fakes rAF and
  `performance.now` only. Use `rng(seed)` from `lms`.
- Framer Motion's WAAPI path is disabled in render mode
  (`delete Element.prototype.animate`); don't rely on it.
- The stage is 1920×1080 or 1080×1920 CSS px (`useScene().W/H`). Output size
  is the device scale factor (hd/fhd 1, 4k 2, 8k 4); never hard-code output
  pixels. Raster content (canvas, footage frames, photos) uses `DPR`.
- Chunks are rendered independently after a 4 s warm-up, so any animation
  must settle within 4 s or chunk seams will show.
- Anything loaded per frame goes through `hold()` / `loadImage()` from
  `lib/barrier.js`; the renderer waits for `window.__lms.settled()`.
- Video backgrounds show source frame `sourceFrame(clip, t)`; frames are
  extracted by `tools/frames.mjs`, never decoded in the browser.
- Lyrics text comes from the track's lyrics file; Whisper only supplies
  timestamps. Don't "correct" lyrics from what Whisper heard. Manual timing
  fixes go into the project's `timing.json`.

## Commits

Strict Conventional Commits, checked by CI (`.commitlintrc.json`):
`type(scope): description`, imperative, lower case, no final period, header
≤ 72 characters. Scopes: engine, blocks, templates, schema, prepare, render,
media, tools, workflows, docker, examples, reference, deps, release, docs,
test, studio (cross-cutting). Breaking changes get `!` and a `BREAKING CHANGE:` footer. One logical
change per commit. Releases come from release-please; don't tag by hand.

## Checking a change

```sh
npm test                                                   # vitest + pytest
node tools/check.mjs                                       # projects against the schema
node tools/render.mjs --track orange-ticket-stub --stills 8,66            # look at out/*.png
node tools/render.mjs --track orange-ticket-stub --format vertical --stills 66
node tools/render.mjs --track footage-demo --stills 22.9,66
node tools/render.mjs --track orange-ticket-stub --range 64,66             # short clip end to end
node tools/compare.mjs <reference-dir> out                 # SSIM against frames from before the change
LMS_PROJECTS=../qubit-quill-tracks/tracks node tools/render.mjs --track kara-kargam --stills 34
```

Rendering is slow (~1.6 s per 4K frame on a 4-core runner): verify with
stills and short ranges, not full songs.
