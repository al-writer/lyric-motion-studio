// Everything the page needs to know comes from the URL:
//   ?track=<slug>          which project to show
//   &format=wide|vertical  16:9 (default) or 9:16
//   &render                driven frame by frame by tools/render.mjs
//   &thumbnail=<variant>   a still cover instead of the video
//   &highlight=<mode>      overrides lyrics.highlight
//   &debug                 draws the layout boxes over the stage
const q = new URLSearchParams(location.search)

export const TRACK = q.get('track')
export const RENDER = q.has('render')
export const VERTICAL = q.get('format') === 'vertical'
export const FORMAT = VERTICAL ? 'vertical' : 'wide'
export const THUMBNAIL = q.get('thumbnail')
export const HIGHLIGHT = q.get('highlight')
export const DEBUG = q.has('debug')
// output pixels per stage pixel (render.mjs passes it; 1 in the preview)
export const DPR = Number(q.get('dpr')) || 1
// render frame rate (render.mjs passes it; video backgrounds pick frame round(t * FPS))
export const FPS = Number(q.get('fps')) || 30

// Stage size in CSS px. Every output size (HD to 8K) is this stage at a
// device scale factor, so text and SVG stay vector-sharp.
export const W = VERTICAL ? 1080 : 1920
export const H = VERTICAL ? 1920 : 1080
