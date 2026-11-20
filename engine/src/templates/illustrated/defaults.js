// Defaults of the illustrated template. A project overrides any key in
// project.json "scene" (both formats) or "wide"/"vertical" → "scene".
export default {
  scene: {
    fade: { in: 1.5, out: 2.5 },
    backdrop: null, // { component: 'Night.jsx' }: full-stage scenery behind the hero
    hero: {
      // component: 'Ticket.jsx' (drawn in a size[0] x size[1] box) | none: the cover art
      component: null,
      type: 'auto', // auto | none
      size: [900, 450],
      poster: 0, // t at which a component hero is drawn on thumbnails
      // where the hero stands (for a 900x450 hero; other sizes keep the same area)
      poses: {
        center: { x: 0, y: -40, scale: 1, rotate: -4 },
        side: { x: -600, y: 10, scale: 0.6, rotate: -12 },
        chorus: { x: -560, y: 0, scale: 0.72, rotate: -6 },
      },
      pose: { default: 'side', bySection: { chorus: 'chorus', outro: 'chorus' }, breaks: { gap: 3, pose: 'center' } },
      spring: { stiffness: 38, damping: 14, mass: 1.2 },
    },
    lyrics: {
      layout: 'wheel', // wheel | single
      box: { left: 790, right: 120, top: 0, bottom: 0 },
      wheel: { R: 380, gap: 34, size: 74, titleSize: 70, scrollLead: 0.3 },
      single: { size: 82, titleSize: 92 },
    },
    // acts: [{ from: 'bridge', after: 0.8, hero: 'center', lyrics: 'caption' }]
    acts: [],
    caption: { box: { left: 200, right: 200, top: 120, height: 140 }, size: 58 },
    reactive: { dots: true, glow: true, tilt: true, motes: true, rings: ['chorus'] },
    spectrum: { show: true, style: 'mirror', box: { side: 120, bottom: 56 } },
    vignette: 0.65,
    grain: 0.09,
    // extra project components: [{ component: 'X.jsx', z: 'background'|'behind-hero'|'above-hero'|'above-lyrics'|'top' }]
    layers: [],
  },
  // 9:16 keeps clear of the Shorts/Reels UI: caption area at the bottom,
  // action buttons on the right.
  vertical: {
    scene: {
      hero: {
        poses: {
          center: { x: -30, y: -160, scale: 1, rotate: -6 },
          side: { x: -30, y: -600, scale: 0.68, rotate: -7 },
          chorus: { x: -30, y: -580, scale: 0.78, rotate: -4 },
        },
      },
      lyrics: {
        box: { left: 80, right: 140, top: 560, bottom: 470 },
        wheel: { R: 470, gap: 30, size: 66, titleSize: 62 },
        single: { size: 74, titleSize: 84 },
      },
      caption: { box: { left: 80, right: 140, top: 400, height: 150 }, size: 54 },
      spectrum: { box: { side: 110, bottom: 400 } },
    },
  },
  thumbnails: { tag: 'Lyric video', t: 66 },
  promo: { badge: 'New song · out now', highlight: [] },
}
