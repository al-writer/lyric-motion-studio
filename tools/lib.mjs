// Shared option parsing and naming for render.mjs / merge.mjs / plan.mjs.
import { readFileSync } from 'node:fs'
import { cpus } from 'node:os'

export const ROOT = new URL('..', import.meta.url).pathname

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
    format: opt.format ?? 'wide', // wide | vertical
    res: opt.res ?? '1080p', // 1080p | 4k
    fps: Number(opt.fps ?? 30),
    quality: opt.quality ?? 'draft', // draft | master | compat
    range: opt.range ? opt.range.split(',').map(Number) : null,
    shard: opt.shard ? opt.shard.split('/').map(Number) : [0, 1],
    shards: 1,
    workers: Number(opt.workers ?? Math.max(1, Math.min(3, cpus().length - 1))),
    stills: opt.stills && opt.stills !== true ? opt.stills.split(',').map(Number) : null,
    dist: opt.dist ?? 'dist',
    out: opt.out ?? 'out',
  }
  o.shards = o.shard[1]
  if (!['wide', 'vertical'].includes(o.format)) throw new Error(`bad --format ${o.format}`)
  if (!['1080p', '4k'].includes(o.res)) throw new Error(`bad --res ${o.res}`)
  if (!QUALITY[o.quality]) throw new Error(`bad --quality ${o.quality}`)
  const audio = JSON.parse(readFileSync(`${ROOT}tracks/${o.track}/build/audio.json`, 'utf8'))
  o.duration = audio.duration
  o.from = o.range?.[0] ?? 0
  o.to = Math.min(o.range?.[1] ?? o.duration, o.duration)
  o.name = `${o.track}-${o.format}-${o.res}${o.fps}${o.range ? `-${o.from}-${o.to}` : ''}`
  o.chunksDir = opt['chunks-dir'] ?? `${o.out}/chunks-${o.name}`
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
export const COLOR = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']

export const viewport = (o) => (o.format === 'vertical' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 })
export const scaleFactor = (o) => (o.res === '4k' ? 2 : 1)

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
