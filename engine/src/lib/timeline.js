// Background timeline of the footage template, shared by the engine (what to
// draw at t) and tools/frames.mjs (which source frames to extract).
// Pure functions, unit-tested.
import { resolveTime } from './lyrics.js'

const IMAGE = /\.(jpe?g|png|webp|avif|gif)$/i

export const mediaKind = (m) => m?.kind ?? (IMAGE.test(m?.src ?? '') ? 'image' : 'video')

/**
 * clips: [{ media, at, in, speed, loop, fit, kenBurns, filters }]
 * transition: { type: 'crossfade' | 'fade-black' | 'cut', dur }
 * → [{ i, media, kind, start, end, in, speed, loop, fit, kenBurns, filters, transition }]
 * A clip runs from its "at" until the next one starts (plus the crossfade,
 * during which the next clip fades in over it).
 */
export function resolveClips(bg, { lines = [], duration = Infinity, media = {} } = {}) {
  const tr = { type: 'crossfade', dur: 0.8, ...bg?.transition }
  const clips = (bg?.clips ?? [])
    .map((c, i) => ({ ...c, start: resolveTime(lines, c.at ?? 0, duration), order: i }))
    .sort((a, b) => a.start - b.start || a.order - b.order)
  return clips.map((c, i) => {
    const m = media[c.media]
    if (!m) throw new Error(`background clip ${i + 1}: media "${c.media}" is not in project.json "media"`)
    const next = clips[i + 1]
    const overlap = tr.type === 'crossfade' && next ? tr.dur : 0
    return {
      i,
      media: c.media,
      kind: mediaKind(m),
      start: c.start,
      end: next ? next.start + overlap : duration,
      in: c.in ?? 0,
      speed: c.speed ?? 1,
      loop: c.loop ?? false,
      fit: c.fit ?? bg.fit ?? 'cover',
      kenBurns: c.kenBurns ?? null,
      filters: c.filters ?? null,
      transition: tr,
    }
  })
}

/** Clips visible at t with their opacity (later clips draw on top). */
export function clipsAt(clips, t) {
  const out = []
  for (const c of clips) {
    if (t < c.start || t >= c.end) continue
    const { type, dur } = c.transition
    let opacity = 1
    if (type === 'crossfade' && c.i > 0) opacity = Math.min(1, (t - c.start) / dur)
    if (type === 'fade-black') {
      const half = dur / 2
      if (c.i > 0) opacity = Math.min(opacity, (t - c.start) / half)
      if (c.i < clips.length - 1) opacity = Math.min(opacity, (c.end - t) / half)
    }
    out.push({ clip: c, opacity: Math.max(0, Math.min(1, opacity)) })
  }
  return out
}

/** Source time of a clip at stage time t; srcDuration (s) wraps loops and freezes the end. */
export function sourceTime(clip, t, srcDuration = Infinity, srcFps = 30) {
  const tau = clip.in + (t - clip.start) * clip.speed
  if (!Number.isFinite(srcDuration)) return tau
  if (clip.loop) return ((tau % srcDuration) + srcDuration) % srcDuration
  return Math.min(tau, Math.max(0, srcDuration - 1 / srcFps))
}

/**
 * Ken Burns: { from: { scale, x, y }, to: { scale, x, y }, ease } with x, y the
 * focus point (0..1 of the image) and scale ≥ 1 over a cover fit.
 * Returns the transform of a cover-fitted image of size iw x ih on a W x H stage.
 */
export function kenBurns(kb, p, W, H, iw, ih) {
  const k = kb.ease === 'linear' ? p : p * p * (3 - 2 * p)
  const a = { scale: 1, x: 0.5, y: 0.5, ...kb.from }
  const b = { scale: 1, x: 0.5, y: 0.5, ...kb.to }
  const s = a.scale + (b.scale - a.scale) * k
  const fx = a.x + (b.x - a.x) * k
  const fy = a.y + (b.y - a.y) * k
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
  const tx = clamp(W / 2 - fx * iw * s, W - iw * s, 0)
  const ty = clamp(H / 2 - fy * ih * s, H - ih * s, 0)
  return { s, tx, ty }
}

/** Largest scale a Ken Burns move reaches (to size the image for it). */
export const kenBurnsMax = (kb) => (kb ? Math.max(kb.from?.scale ?? 1, kb.to?.scale ?? 1) : 1)

/**
 * Source frame shown at stage time t: the frame on screen at the clip's
 * source time (as a player would show it), clamped to the last frame, or
 * wrapped when looping. meta = { fps, frames } from build/media.json.
 */
export function sourceFrame(clip, t, meta) {
  const fps = meta.fps || 30
  const total = Math.max(1, meta.frames || Math.round((meta.duration || 0) * fps) || 1)
  const n = Math.floor((clip.in + (t - clip.start) * clip.speed) * fps + 1e-6)
  if (clip.loop) return ((n % total) + total) % total
  return Math.max(0, Math.min(total - 1, n))
}
