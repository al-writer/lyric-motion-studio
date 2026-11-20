// Frame-exact video backgrounds: headless Chromium cannot decode H.264 and a
// <video> element is not frame-accurate anyway, so before a chunk is rendered
// the source frames it needs are extracted with ffmpeg, already fitted to the
// stage at the output resolution and with the constant filters baked in.
// The engine shows source frame sourceFrame(clip, t) for every render frame.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveConfig } from '../engine/src/lib/config.js'
import { mediaPath } from '../engine/src/lib/media.js'
import { kenBurnsMax, resolveClips, sourceFrame } from '../engine/src/lib/timeline.js'
import { fetchMedia, probe } from './media.mjs'

const GRADES = {
  'teal-orange': 'colorbalance=rs=-0.08:gs=-0.02:bs=0.12:rh=0.10:gh=0.02:bh=-0.10',
  warm: 'colorbalance=rm=0.06:bm=-0.06:rh=0.05:bh=-0.05',
  cool: 'colorbalance=rm=-0.05:bm=0.06:rh=-0.04:bh=0.05',
  mono: 'hue=s=0',
  faded: "curves=all='0/0.07 0.5/0.5 1/0.93',eq=saturation=0.85",
}

/** ffmpeg filters for the constant part of cfg.scene.filters (blur in stage px) */
export function ffmpegFilters(f = {}, dpr = 1) {
  const out = []
  if (f.blur) out.push(`gblur=sigma=${(f.blur * dpr).toFixed(2)}`)
  if (f.brightness != null && f.brightness !== 1) out.push(`colorchannelmixer=rr=${f.brightness}:gg=${f.brightness}:bb=${f.brightness}`)
  if ((f.contrast ?? 1) !== 1 || (f.saturate ?? 1) !== 1) out.push(`eq=contrast=${f.contrast ?? 1}:saturation=${f.saturate ?? 1}`)
  if (f.hue) out.push(`hue=h=${f.hue}`)
  if (f.sepia) {
    const a = f.sepia
    const S = [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131]
    const I = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    const m = S.map((s, i) => (I[i] * (1 - a) + s * a).toFixed(3))
    out.push(`colorchannelmixer=${m[0]}:${m[1]}:${m[2]}:0:${m[3]}:${m[4]}:${m[5]}:0:${m[6]}:${m[7]}:${m[8]}`)
  }
  if (f.grade && f.grade !== 'none') out.push(GRADES[f.grade] ?? (() => { throw new Error(`unknown grade "${f.grade}"`) })())
  return out
}

const fit = (kind, w, h) =>
  kind === 'contain'
    ? `scale=${w}:${h}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${w}:${h}:-1:-1:black`
    : `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}`

/** Resolved config of a project for one format (template defaults included). */
export async function loadConfig(dir, project, format) {
  const name = project.template ?? 'illustrated'
  const path = new URL(`../engine/src/templates/${name}/defaults.js`, import.meta.url)
  const template = existsSync(path) ? { defaults: (await import(path)).default } : {}
  return resolveConfig(project, template, format)
}

/**
 * Extracts every background frame needed for render frames [fa, fb) into
 * <out>/<clip>/<frame>.jpg (photos: <out>/<clip>/still.jpg). Returns false when
 * the project has no background clips.
 */
export async function prepareFrames(o, fa, fb, out) {
  const cfg = await loadConfig(o.dir, o.project, o.format)
  const bg = cfg.scene?.background
  if (!bg?.clips?.length) return false
  const lines = JSON.parse(readFileSync(join(o.dir, 'build/lyrics.json'), 'utf8')).lines
  // only the clips' media (not the song) is needed here
  await fetchMedia(o.dir, { quiet: true, only: [...new Set(bg.clips.map((c) => c.media))] })
  const infoFile = join(o.dir, 'build/media.json')
  const info = existsSync(infoFile) ? JSON.parse(readFileSync(infoFile, 'utf8')) : {}
  const clips = resolveClips(bg, { lines, duration: o.duration, media: cfg.media })
  const dpr = o.dpr
  const [W, H] = o.format === 'vertical' ? [1080, 1920] : [1920, 1080]
  for (const c of clips) {
    const f0 = Math.max(fa, Math.ceil(c.start * o.fps - 1e-6))
    const f1 = Math.min(fb, Math.ceil(c.end * o.fps - 1e-6))
    if (f1 <= f0) continue
    const m = cfg.media[c.media]
    const src = join(o.dir, mediaPath(c.media, m.src))
    const filters = ffmpegFilters({ ...cfg.scene.filters, ...c.filters }, dpr)
    const dest = join(out, String(c.i))
    mkdirSync(dest, { recursive: true })
    if (c.kind === 'image') {
      if (existsSync(join(dest, 'still.jpg'))) continue
      const k = kenBurnsMax(c.kenBurns)
      const [w, h] = [W, H].map((v) => Math.round(v * dpr * k))
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', [fit(c.fit, w, h), ...filters].join(','), '-frames:v', '1', '-q:v', '2', join(dest, 'still.jpg')])
      continue
    }
    // source frames shown by render frames f0..f1-1, extracted 1:1 and named by
    // their own number, so the result does not depend on where a chunk starts
    const meta = info[c.media] ?? probe(src)
    const need = new Set()
    for (let f = f0; f < f1; f++) need.add(sourceFrame(c, f / o.fps, meta))
    const todo = [...need].filter((n) => !existsSync(join(dest, `${String(n).padStart(7, '0')}.jpg`))).sort((x, y) => x - y)
    // contiguous runs (a loop wraps into two)
    const runs = []
    for (const n of todo) runs.at(-1) && n === runs.at(-1)[1] + 1 ? (runs.at(-1)[1] = n) : runs.push([n, n])
    for (const [n0, n1] of runs)
      execFileSync('ffmpeg', [
        '-v', 'error', '-y',
        // a hair before frame n0, so accurate seeking starts exactly on it
        '-ss', Math.max(0, (n0 - 0.5) / meta.fps).toFixed(5), '-i', src, '-an',
        '-vf', [fit(c.fit, Math.round(W * dpr), Math.round(H * dpr)), ...filters].join(','),
        '-fps_mode', 'passthrough', '-frames:v', String(n1 - n0 + 1), '-start_number', String(n0), '-q:v', '2',
        join(dest, '%07d.jpg'),
      ])
  }
  return true
}
