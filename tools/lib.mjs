// Shared option parsing and naming for render.mjs / merge.mjs / plan.mjs.
import { existsSync, readFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join, resolve } from 'node:path'
import { mediaPath } from '../engine/src/lib/media.js'

export const ROOT = new URL('..', import.meta.url).pathname

// Output sizes. The stage is always 1920x1080 (or 1080x1920) CSS px; the
// device scale factor sets the real pixels, so text and SVG are drawn
// natively at every size ("retina ready"). HD is rendered at FHD and
// downscaled, which anti-aliases better than drawing at 2/3 scale.
export const RES = {
  hd: { dsf: 1, size: [1280, 720] },
  fhd: { dsf: 1, size: [1920, 1080] },
  '4k': { dsf: 2, size: [3840, 2160] },
  '8k': { dsf: 4, size: [7680, 4320] },
}

export function projectsDir(opt = {}) {
  return resolve(opt.projects ?? process.env.LMS_PROJECTS ?? 'tracks')
}

export function readProject(dir) {
  const file = join(dir, 'project.json')
  if (!existsSync(file)) throw new Error(`no project.json in ${dir}`)
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** local file of the track's audio (fetched copy for r2:// and https://) */
export function audioFile(dir, project) {
  if (!project.audio) throw new Error(`${dir}: project.json has no "audio"`)
  const file = join(dir, mediaPath('audio', project.audio))
  if (!existsSync(file)) throw new Error(`${file} is missing${/^(r2|https?):/.test(project.audio) ? ': run node tools/media.mjs fetch' : ''}`)
  return file
}

export function parseArgs(argv = process.argv.slice(2)) {
  const opt = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    const next = argv[i + 1]
    opt[key] = next === undefined || next.startsWith('--') ? true : (i++, next)
  }
  if (!opt.track) throw new Error('--track <slug> is required')
  const o = {
    track: opt.track,
    projects: projectsDir(opt),
    format: opt.format ?? 'wide', // wide | vertical
    res: opt.res ?? 'fhd', // hd | fhd | 4k | 8k
    fps: Number(opt.fps ?? 30),
    quality: opt.quality ?? 'draft', // draft | master | compat
    range: opt.range ? opt.range.split(',').map(Number) : null,
    shard: opt.shard ? opt.shard.split('/').map(Number) : [0, 1],
    shards: 1,
    workers: Number(opt.workers ?? Math.max(1, Math.min(3, cpus().length - 1))),
    stills: opt.stills && opt.stills !== true ? opt.stills.split(',').map(Number) : null,
    thumbnail: opt.thumbnail ? (opt.thumbnail === true ? 'hero,line,macro,promo' : opt.thumbnail).split(',') : null,
    highlight: opt.highlight ?? null, // overrides lyrics.highlight
    out: resolve(opt.out ?? 'out'),
    build: opt['no-build'] !== true,
  }
  o.dir = join(o.projects, o.track)
  o.project = readProject(o.dir)
  o.dist = resolve(opt.dist ?? join(o.out, `dist-${o.track}`))
  o.shards = o.shard[1]
  if (!['wide', 'vertical'].includes(o.format)) throw new Error(`bad --format ${o.format}`)
  if (!RES[o.res]) throw new Error(`bad --res ${o.res} (${Object.keys(RES).join(', ')})`)
  if (!QUALITY[o.quality]) throw new Error(`bad --quality ${o.quality}`)
  if (o.highlight && !['word', 'line', 'wipe', 'none'].includes(o.highlight)) throw new Error(`bad --highlight ${o.highlight}`)
  const audioJson = join(o.dir, 'build', 'audio.json')
  if (!existsSync(audioJson)) throw new Error(`${o.track} is not prepared yet: run tools/prepare.py ${o.track}`)
  o.duration = JSON.parse(readFileSync(audioJson, 'utf8')).duration
  o.from = o.range?.[0] ?? 0
  o.to = Math.min(o.range?.[1] ?? o.duration, o.duration)
  o.name = `${o.track}-${o.format}-${o.res}${o.fps}${o.range ? `-${o.from}-${o.to}` : ''}${o.highlight && o.highlight !== 'word' ? `-${o.highlight}` : ''}`
  o.chunksDir = resolve(opt['chunks-dir'] ?? join(o.out, `chunks-${o.name}`))
  return o
}

// Capture and encoder settings per quality preset. Frames come out of
// Chromium as sRGB JPEG (PNG is 2x slower and indistinguishable after 4:2:0
// video encoding); scale converts them to BT.709 so colours match on players.
export const QUALITY = {
  draft: { jpeg: 90, codec: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'] },
  compat: { jpeg: 98, codec: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-profile:v', 'high', '-pix_fmt', 'yuv420p'] },
  master: {
    jpeg: 98,
    codec: ['-c:v', 'libx265', '-preset', 'fast', '-crf', '15', '-pix_fmt', 'yuv420p10le', '-tag:v', 'hvc1', '-x265-params', 'log-level=error'],
  },
}

export const outSize = (o) => (o.format === 'vertical' ? [...RES[o.res].size].reverse() : RES[o.res].size)

/** ffmpeg colour conversion (and downscale for HD) */
export function color(o) {
  const [w, h] = outSize(o)
  const [vw, vh] = Object.values(viewport(o)).map((v) => v * scaleFactor(o))
  const size = w !== vw || h !== vh ? `${w}:${h}:flags=lanczos:` : ''
  return ['-vf', `scale=${size}out_color_matrix=bt709:out_range=tv`, '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']
}

export const viewport = (o) => (o.format === 'vertical' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 })
export const scaleFactor = (o) => RES[o.res].dsf

// Frames [first, last) cut into equal chunks: enough for every worker of
// every shard to get one, but no longer than 20 s each.
export function plan(o) {
  const first = Math.round(o.from * o.fps)
  const last = Math.ceil(o.to * o.fps)
  const size = Math.max(o.fps * 2, Math.min(o.fps * 20, Math.ceil((last - first) / (o.shards * o.workers))))
  const chunks = []
  for (let f = first; f < last; f += size) chunks.push([f, Math.min(last, f + size)])
  return chunks
}

export const chunkFile = (o, [a, b]) => `${o.chunksDir}/c-${String(a).padStart(7, '0')}-${String(b).padStart(7, '0')}.mp4`
