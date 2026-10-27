import { VERTICAL } from './params.js'

// Every track folder is discovered at build time; only the chosen one is loaded.
const scenes = import.meta.glob('@tracks/*/scene.json', { import: 'default' })
const lyricsFiles = import.meta.glob('@tracks/*/build/lyrics.json', { import: 'default' })
const audioFiles = import.meta.glob('@tracks/*/build/audio.json', { import: 'default' })
const covers = import.meta.glob('@tracks/*/build/cover.jpg', { query: '?url', import: 'default' })
const songs = import.meta.glob('@tracks/*/song.{mp3,wav,m4a,flac}', { query: '?url', import: 'default' })
const heroes = import.meta.glob('@tracks/*/scene/*.jsx', { import: 'default' })

const slugOf = (path) => path.match(/tracks\/([^/]+)\//)[1]
export const TRACKS = [...new Set(Object.keys(scenes).map(slugOf))].sort()

const pick = (globbed, slug, file) => {
  const key = Object.keys(globbed).find((k) => slugOf(k) === slug && (!file || k.endsWith(`/${file}`)))
  return key ? globbed[key]() : Promise.resolve(null)
}

const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

// Per-frame audio features (tools/prepare.py) as 0..1 lookups.
function makeFeatures(data) {
  const spectrum = decode(data.spectrum)
  const energy = decode(data.energy)
  const bass = decode(data.bass)
  const high = decode(data.high)
  const frame = (t) => Math.max(0, Math.min(data.frames - 1, Math.round(t * data.fps)))
  return (t) => {
    const f = frame(t)
    return {
      energy: energy[f] / 255,
      bass: bass[f] / 255,
      high: high[f] / 255,
      band: (i) => spectrum[f * data.bands + i] / 255,
    }
  }
}

const DEFAULT_PALETTE = {
  intro: { base: '#140c18', glow: 'rgba(255,122,26,0.30)', glow2: 'rgba(120,60,200,0.18)' },
  verse: { base: '#0c0f1e', glow: 'rgba(255,138,42,0.22)', glow2: 'rgba(40,90,200,0.22)' },
  pre: { base: '#170e22', glow: 'rgba(255,106,58,0.32)', glow2: 'rgba(170,50,160,0.22)' },
  chorus: { base: '#250d12', glow: 'rgba(255,122,26,0.55)', glow2: 'rgba(255,60,90,0.25)' },
  bridge: { base: '#08171b', glow: 'rgba(255,176,90,0.25)', glow2: 'rgba(30,150,160,0.22)' },
  outro: { base: '#150c14', glow: 'rgba(255,122,26,0.38)', glow2: 'rgba(120,60,200,0.18)' },
}

export const DEFAULT_SCENE = {
  title: '',
  artist: '',
  layout: 'wheel', // wheel | single
  fonts: { body: 'Fraunces Variable', display: 'Space Mono', hand: 'Caveat' },
  colors: { text: '#f7ead9', accent: '#ff8a2a', accentSoft: '#ffb470' },
  palette: DEFAULT_PALETTE,
  hero: { type: 'cover' }, // cover | component (+ file) | none
  emphasis: [], // regexes: lines drawn in the display font, accent colour
  pop: [], // regexes: lines whose words pop in with a spring
  italicSections: ['bridge'],
  reactive: { dots: true, glow: true, tilt: true, motes: true, spectrum: true, rings: ['chorus'] },
  fadeIn: 1.5,
  fadeOut: 2.5,
}

export async function loadTrack(slug) {
  const [scene, lyrics, audio, cover, song] = await Promise.all([
    pick(scenes, slug),
    pick(lyricsFiles, slug),
    pick(audioFiles, slug),
    pick(covers, slug),
    pick(songs, slug),
  ])
  if (!scene) throw new Error(`Unknown track "${slug}". Known: ${TRACKS.join(', ')}`)
  if (!lyrics || !audio) throw new Error(`Track "${slug}" is not prepared yet: run tools/prepare.py ${slug}`)
  const merged = {
    ...DEFAULT_SCENE,
    ...scene,
    fonts: { ...DEFAULT_SCENE.fonts, ...scene.fonts },
    colors: { ...DEFAULT_SCENE.colors, ...scene.colors },
    palette: { ...DEFAULT_PALETTE, ...scene.palette },
    reactive: { ...DEFAULT_SCENE.reactive, ...scene.reactive },
  }
  const Hero = merged.hero.type === 'component' ? await pick(heroes, slug, merged.hero.file) : null
  const re = (list) => list.map((s) => new RegExp(s, 'i'))
  return {
    slug,
    scene: merged,
    lines: lyrics.lines,
    duration: audio.duration,
    features: makeFeatures(audio),
    beats: audio.beats,
    bands: audio.bands,
    coverUrl: cover,
    songUrl: song,
    Hero,
    emphasis: re(merged.emphasis),
    pop: re(merged.pop),
    vertical: VERTICAL,
  }
}

export const lineText = (line) => line.words.map((w) => w.w).join(' ')
export const isEmphasis = (track, line) => track.emphasis.some((r) => r.test(lineText(line)))
export const isPop = (track, line) => track.pop.some((r) => r.test(lineText(line)))
