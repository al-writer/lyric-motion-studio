# Copper on the Terrace: YouTube upload kit

Not published yet.

## Title

Qubit Quill – Copper on the Terrace (Official Lyric Video)

## Shorts (final chorus, 3:13–3:46)

```sh
node tools/render.mjs --track copper-on-the-terrace --format vertical --range 193,226 --quality compat
```

Title options:

- gold turning to rust 🧡 Qubit Quill – Copper on the Terrace
- POV: the summer ends before the party does · Copper on the Terrace

## Thumbnails

Drawn by `scene/Covers.jsx` in the video's own look (variants in scene.json
`covers.variants`):

```sh
node tools/render.mjs --track copper-on-the-terrace --thumbnail title,rust,pov,dust,souvenir,brightest,tradewinds
node tools/render.mjs --track copper-on-the-terrace --format vertical --thumbnail title,rust,pov
```

Main video: `title`; put `rust` and `pov` in YouTube Studio → *Test & Compare*.
Shorts: `vertical-rust`. The others (`dust`, `souvenir`, `brightest`,
`tradewinds`) are for later posts and clips.

## Cover lines

Extra lines to set beside the title on some covers (lines from the song):

- Gold Turning to Rust
- Velvet Dust
- Souvenir
- The Brightest Hour of a Dying Year
- Before the Trade Winds Fail
- POV: the summer ends before the party does

## Chapters

From the Whisper timing in `build/lyrics.json` (check against the final render):

```
0:00 Intro
0:20 Verse 1
0:50 Pre-Chorus
1:06 Chorus
1:37 Verse 2
2:09 Pre-Chorus
2:27 Chorus
3:00 Bridge
3:14 Final Chorus
3:47 Outro
```
