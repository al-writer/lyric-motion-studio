// Defaults of the footage template: video or photo background, filters, big
// lyric lines over it (the common YouTube lyric-video look).
export default {
  scene: {
    fade: { in: 1.5, out: 2.5 },
    // background.clips: [{ media, at, in, speed, loop, fit, kenBurns: { from, to, ease }, filters }]
    background: { clips: [], transition: { type: 'crossfade', dur: 0.8 }, fit: 'cover' },
    // constant filters are baked into the extracted frames; film/vhs are drawn per frame
    filters: { blur: 0, brightness: 0.72, contrast: 1.05, saturate: 0.9, hue: 0, sepia: 0, grade: 'none', vignette: 0.55, film: { grain: 0.1, flicker: 0.03, dust: false, weave: 0 }, vhs: null },
    // tint over the picture, e.g. "rgba(10,8,20,0.25)"
    tint: null,
    lyrics: {
      position: 'center', // center | lower | upper
      box: { left: 160, right: 160, top: 300, bottom: 300 },
      size: 86,
      titleSize: 96,
      align: 'center',
      enter: 'rise-blur', // fade | rise-blur | words-pop | typewriter
      exit: 'fade-up', // fade | fade-up | blur | none
      enterDur: 0.6,
      exitDur: 0.45,
      previous: 'none', // none | dim: the line before stays above, dimmed
      shadow: '0 4px 28px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.6)',
      uppercase: false,
    },
    titleCard: { show: true, size: 120, artistSize: 34 },
    spectrum: { show: false, style: 'mirror', progress: false, box: { side: 120, bottom: 56 } },
    layers: [],
  },
  lyrics: { highlight: 'none' }, // word | line | wipe | none
  vertical: {
    scene: {
      lyrics: { box: { left: 80, right: 150, top: 640, bottom: 640 }, size: 74, titleSize: 84 },
      titleCard: { size: 96 },
      spectrum: { box: { side: 110, bottom: 400 } },
    },
  },
  thumbnails: { tag: 'Lyric video', t: 60 },
  promo: { badge: 'New song · out now', highlight: [] },
}
