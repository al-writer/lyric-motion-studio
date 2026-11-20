import projects from 'virtual:lms-projects'
import { checkStudioVersion, resolveConfig } from './config.js'
import { makeAudio } from './audio.js'
import { tagLines } from './lyrics.js'
import { mediaUrl, projectUrl } from './media.js'
import { FORMAT, HIGHLIGHT, VERTICAL } from './params.js'
import { TEMPLATES } from '../templates/index.js'

export const TRACKS = Object.keys(projects)

const fetchJson = async (url, what) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${what} is missing (${url}): run tools/prepare`)
  return r.json()
}
const exists = async (url) => (await fetch(url, { method: 'HEAD' })).ok

/** component file named in project.json ("Crows.jsx" or "components/Crows.jsx") */
async function component(entry, slug, name) {
  if (!name) return null
  const key = name.replace(/^components\//, '')
  const load = entry.components[key]
  if (!load) throw new Error(`${slug}: components/${key} not found (have: ${Object.keys(entry.components).join(', ') || 'none'})`)
  const mod = await load()
  return mod.default ?? mod
}

/** Every component a config names: values of "component" keys, "director", layers. */
function namedComponents(cfg) {
  const names = new Set()
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) k === 'component' && typeof x === 'string' ? names.add(x) : walk(x)
  }
  walk(cfg.scene)
  walk(cfg.thumbnails)
  if (cfg.director) names.add(cfg.director)
  return [...names]
}

export async function loadTrack(slug) {
  const entry = projects[slug]
  if (!entry) throw new Error(`Unknown track "${slug}". Known: ${TRACKS.join(', ')}`)
  const project = await entry.config()
  checkStudioVersion(project)
  const template = TEMPLATES[project.template ?? 'illustrated']
  if (!template) throw new Error(`${slug}: unknown template "${project.template}" (have: ${Object.keys(TEMPLATES).join(', ')})`)
  const cfg = resolveConfig(project, template, FORMAT, HIGHLIGHT ? { lyrics: { highlight: HIGHLIGHT } } : {})
  const [lyrics, audioData, media, hasCover] = await Promise.all([
    fetchJson(projectUrl(slug, 'build/lyrics.json'), 'build/lyrics.json'),
    fetchJson(projectUrl(slug, 'build/audio.json'), 'build/audio.json'),
    fetch(projectUrl(slug, 'build/media.json')).then((r) => (r.ok ? r.json() : {})),
    exists(projectUrl(slug, 'build/cover.jpg')),
    entry.styles(),
  ])
  const components = {}
  for (const name of namedComponents(cfg)) components[name.replace(/^components\//, '')] = await component(entry, slug, name)
  const audio = makeAudio(audioData)
  return {
    slug,
    cfg,
    template,
    lines: tagLines(lyrics.lines, cfg.lyrics),
    audio,
    // shortcuts used by most components
    duration: audio.duration,
    features: audio.features,
    beats: audio.beats,
    bands: audio.bands,
    vertical: VERTICAL,
    coverUrl: hasCover ? projectUrl(slug, 'build/cover.jpg') : null,
    songUrl: mediaUrl(slug, 'audio', cfg.audio),
    media: Object.fromEntries(Object.entries(cfg.media).map(([id, m]) => [id, { ...m, ...media[id], id, url: mediaUrl(slug, id, m.src) }])),
    component: (name) => (name ? components[name.replace(/^components\//, '')] ?? null : null),
    director: components[cfg.director?.replace(/^components\//, '')] ?? null,
  }
}

/** Resolves once every font the config names is loaded (canvas measureText needs it). */
export function fontsReady(cfg) {
  const families = [...new Set(Object.values(cfg.fonts))]
  const faces = families.flatMap((f) => [`400 100px '${f}'`, `700 100px '${f}'`, `italic 500 100px '${f}'`])
  return Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready)
}
