import { VERTICAL } from './params.js'

// Stage size in CSS px. 4K output is the same stage rendered at device
// scale factor 2, so text and SVG stay vector-sharp.
export const W = VERTICAL ? 1080 : 1920
export const H = VERTICAL ? 1920 : 1080

// Hero poses for a 900x450 hero; other hero sizes are scaled to the same area.
// Centred on title cards and breaks, parked beside (16:9) or above (9:16)
// the lyrics while singing.
export const HERO_POSE = VERTICAL
  ? {
      center: { x: -30, y: -160, scale: 1, rotate: -6 },
      side: { x: -30, y: -600, scale: 0.68, rotate: -7 },
      chorus: { x: -30, y: -580, scale: 0.78, rotate: -4 },
    }
  : {
      center: { x: 0, y: -40, scale: 1, rotate: -4 },
      side: { x: -600, y: 10, scale: 0.6, rotate: -12 },
      chorus: { x: -560, y: 0, scale: 0.72, rotate: -6 },
    }

// 9:16 keeps clear of the Reels/Shorts UI: caption area at the bottom,
// action buttons on the right.
export const LYRICS_BOX = VERTICAL ? { left: 80, right: 140, top: 560, bottom: 470 } : { left: 790, right: 120, top: 0, bottom: 0 }
export const SPECTRUM_BOX = VERTICAL ? { side: 110, bottom: 400 } : { side: 120, bottom: 56 }

// Lyric wheel geometry (radius of the virtual cylinder, font sizes).
export const WHEEL = VERTICAL ? { R: 470, gap: 30, size: 66, titleSize: 62 } : { R: 380, gap: 34, size: 74, titleSize: 70 }
