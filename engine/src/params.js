// Everything the page needs to know comes from the URL:
//   ?track=<slug>          which folder under tracks/ to show
//   &format=wide|vertical  16:9 (default) or 9:16
//   &render                driven frame by frame by tools/render.mjs
//   &thumbnail=<variant>   a still YouTube thumbnail instead of the video (see Thumbnail.jsx)
const q = new URLSearchParams(location.search)

export const TRACK = q.get('track')
export const RENDER = q.has('render')
export const VERTICAL = q.get('format') === 'vertical'
export const THUMBNAIL = q.get('thumbnail')
