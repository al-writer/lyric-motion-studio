import { useScene } from '../lib/scene.jsx'
import { rgba } from '../lib/math.js'

/** Warm light that swells on the low end, centred on (x, y). */
export function BassGlow({ x, y }) {
  const { t, track, cfg } = useScene()
  const { bass } = track.features(t)
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 700,
        top: y - 500,
        width: 1400,
        height: 1000,
        background: `radial-gradient(closest-side, ${rgba(cfg.colors.glow, 0.55)}, transparent)`,
        opacity: 0.08 + 0.32 * bass ** 1.5,
      }}
    />
  )
}

/** Thin rings that ripple out from (x, y) on kick drums. */
export function BeatRings({ x, y }) {
  const { t, track, cfg } = useScene()
  return track.beats
    .filter(([b]) => t >= b && t - b < 1.6)
    .map(([b, s]) => {
      const p = (t - b) / 1.6
      const size = 380 + 900 * (1 - (1 - p) ** 3)
      return (
        <div
          key={b}
          style={{
            position: 'absolute',
            left: x - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            borderRadius: '50%',
            border: `${2 - p}px solid ${rgba(cfg.colors.glow, 0.42 * s * (1 - p) ** 2)}`,
            pointerEvents: 'none',
          }}
        />
      )
    })
}

/**
 * Spectrum on a progress line.
 *   style  mirror: bass in the middle, highs at the edges (default) | bars: low → high
 *   box    { side, bottom, height }
 *   bars   false: only the progress line
 */
export function Spectrum({ box = { side: 120, bottom: 56 }, style = 'mirror', bars = true, progress = true, height = 60 }) {
  const { t, track, cfg, W } = useScene()
  const { band } = track.features(t)
  const { accent, text } = cfg.colors
  const n = style === 'mirror' ? track.bands * 2 : track.bands
  const left = box.side
  const width = W - 2 * box.side
  const step = width / n
  const played = t / track.duration
  return (
    <div style={{ position: 'absolute', left, width, bottom: box.bottom, height }}>
      {bars &&
        Array.from({ length: n }, (_, i) => {
          const b = style === 'mirror' ? (i < track.bands ? track.bands - 1 - i : i - track.bands) : i
          const v = band(b)
          const done = (i + 0.5) / n < played
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: i * step + step * 0.3,
                width: step * 0.4,
                bottom: 8,
                height: 3 + 40 * Math.sqrt(v),
                borderRadius: step * 0.2,
                background: done ? accent : text,
                opacity: done ? 0.35 + 0.45 * v : 0.1 + 0.18 * v,
              }}
            />
          )
        })}
      {progress && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 2, background: 'rgba(247,234,217,0.12)' }}>
          <div style={{ width: `${played * 100}%`, height: '100%', background: accent, borderRadius: 2 }} />
        </div>
      )}
    </div>
  )
}
