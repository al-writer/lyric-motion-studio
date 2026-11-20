// Where project files and media are served from (engine/vite/plugin.js):
// /p/<slug>/<path>. Remote media (r2://key, https://…) is fetched into
// <project>/.media/<id><ext> by tools/media.mjs and served from there.
export const projectUrl = (slug, path) => `${import.meta.env.DEV ? '/' : './'}p/${slug}/${path.replace(/^\.?\//, '')}`

export const isRemote = (src) => /^(r2|https?):\/\//.test(src ?? '')

const extOf = (src) => (/\.[a-z0-9]{2,5}$/i.exec(src.split('?')[0]) ?? [''])[0].toLowerCase()

/** path inside the project where a media item lives (fetched copy for remote ones) */
export const mediaPath = (id, src) => (isRemote(src) ? `.media/${id}${extOf(src)}` : src)

export const mediaUrl = (slug, id, src) => (src ? projectUrl(slug, mediaPath(id, src)) : null)
