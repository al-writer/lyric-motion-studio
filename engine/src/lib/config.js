// Project configuration: engine defaults ← template defaults (base, then the
// format's own block) ← project.json (base, then "wide" / "vertical").
// Objects merge key by key; arrays and plain values replace.
export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export function merge(...layers) {
  const out = {}
  for (const layer of layers) {
    if (!isObject(layer)) continue
    for (const [k, v] of Object.entries(layer)) out[k] = isObject(v) && isObject(out[k]) ? merge(out[k], v) : isObject(v) ? merge(v) : v
  }
  return out
}

const FORMATS = ['wide', 'vertical']
const withoutFormats = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => !FORMATS.includes(k) && k !== '$schema'))

// set by release-please; projects declare the major they need ("studio": "^1")
export const STUDIO_VERSION = '0.9.0' // x-release-please-version
// the first release is 1.0.0: until then the code already is studio 1
export const STUDIO_MAJOR = Math.max(1, Number(STUDIO_VERSION.split('.')[0]))

export const ENGINE_DEFAULTS = {
  title: '',
  artist: '',
  language: 'en',
  audio: null, // path in the project, or r2://key, or https://… (fetched into .media/)
  template: 'illustrated',
  fonts: { body: 'Fraunces Variable', display: 'Space Mono', hand: 'Caveat' },
  // glow: "r,g,b" of every halo; mote: colour of drifting specks
  colors: { text: '#f7ead9', accent: '#ff8a2a', accentSoft: '#ffb470', glow: '255,138,42', mote: '#ffc58a' },
  palette: {
    intro: { base: '#140c18', glow: 'rgba(255,122,26,0.30)', glow2: 'rgba(120,60,200,0.18)' },
    verse: { base: '#0c0f1e', glow: 'rgba(255,138,42,0.22)', glow2: 'rgba(40,90,200,0.22)' },
    pre: { base: '#170e22', glow: 'rgba(255,106,58,0.32)', glow2: 'rgba(170,50,160,0.22)' },
    chorus: { base: '#250d12', glow: 'rgba(255,122,26,0.55)', glow2: 'rgba(255,60,90,0.25)' },
    bridge: { base: '#08171b', glow: 'rgba(255,176,90,0.25)', glow2: 'rgba(30,150,160,0.22)' },
    outro: { base: '#150c14', glow: 'rgba(255,122,26,0.38)', glow2: 'rgba(120,60,200,0.18)' },
  },
  lyrics: {
    file: null, // lyrics.lrc | lyrics.txt (found automatically)
    timing: 'whisper', // whisper | lrc
    highlight: 'word', // word | line | wipe | none
    lead: 0.45, // a line becomes current this long before its first word
    hold: 2.4, // and stays current at most this long after its last word
    creditsLead: 1.5, // opening credits leave this long before the first line
    emphasis: [], // regexes: lines set in the display font, accent colour
    pop: [], // regexes: lines whose words pop in with a spring
    italicSections: ['bridge'],
  },
  media: {}, // id → { src, sha256 }: footage and photos kept outside git
  director: null, // components/<file>.js: (ctx) => partial direction, see lib/lyrics.js
  scene: {},
  thumbnails: {},
  promo: {},
}

/**
 * Resolves the final configuration for one format.
 * `template` is { defaults } from engine/src/templates.
 */
export function resolveConfig(project, template, format, overrides = {}) {
  const t = template?.defaults ?? {}
  return merge(ENGINE_DEFAULTS, withoutFormats(t), t[format], withoutFormats(project), project?.[format], overrides)
}

/** "^1", "1", "1.2" → major version; throws when the project wants another studio */
export function checkStudioVersion(project) {
  const want = project.studio
  if (want == null) return
  const major = Number(String(want).replace(/^[\^~>=v ]+/, '').split('.')[0])
  if (major !== STUDIO_MAJOR) throw new Error(`project needs studio ${want}, this is studio ${STUDIO_MAJOR}.x`)
}
