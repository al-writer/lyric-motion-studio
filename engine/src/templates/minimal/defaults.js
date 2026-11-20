// Defaults of the minimal template: the cover art, title and a spectrum on a
// blurred copy of the cover. Optional single lyric line.
export default {
  scene: {
    fade: { in: 1.5, out: 2.5 },
    // cover: build/cover.jpg (from the audio file) or "media" id of an image
    // 16:9: cover on the left, title and lyric line on the right
    cover: { media: null, size: 600, radius: 24, x: -420, y: -40, backdropBlur: 60, backdropDim: 0.55 },
    title: { show: true, size: 72, artistSize: 26, align: 'left', box: { left: 920, right: 140, top: 300 } },
    lyrics: { show: false, box: { left: 920, right: 140, top: 560, height: 160 }, size: 52, align: 'left', enter: 'fade', exit: 'fade' },
    spectrum: { show: true, style: 'mirror', progress: true, box: { side: 120, bottom: 70 } },
    grain: 0.06,
    layers: [],
  },
  lyrics: { highlight: 'none' },
  vertical: {
    scene: {
      // 9:16: cover, title, line and spectrum stacked, clear of the Shorts UI
      cover: { size: 760, x: 0, y: -300 },
      title: { size: 60, align: 'center', box: { left: 80, right: 80, top: 1110 } },
      lyrics: { box: { left: 80, right: 80, top: 1250, height: 140 }, size: 48, align: 'center' },
      spectrum: { box: { side: 140, bottom: 470 } },
    },
  },
  thumbnails: { tag: 'Lyric video', t: 30 },
  promo: { badge: 'New song · out now', highlight: [] },
}
