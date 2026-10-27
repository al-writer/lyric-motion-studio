import { SPECTRUM_BOX, W } from './format.js'

// Audio-reactive layers. Everything is a pure function of t, so the
// renderer's frame-by-frame output matches live playback.

// Faint perforation-like dot grid; a soft spotlight drifts across it and
// brightens with the music's overall energy.
export function DotGrid({ track, t }) {
  const { energy } = track.features(t)
  const cx = 50 + Math.sin(t * 0.07) * 28
  const cy = 50 + Math.cos(t * 0.05) * 22
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,214,170,0.9) 1.3px, transparent 1.8px)',
        backgroundSize: '38px 38px',
        backgroundPosition: `${(t * 3) % 38}px ${(t * 1.5) % 38}px`,
        opacity: 0.05 + 0.13 * energy,
        maskImage: `radial-gradient(700px 520px at ${cx}% ${cy}%, #000, transparent 75%)`,
      }}
    />
  )
}

// Warm light behind the hero that swells on the low end.
export function BassGlow({ track, t, x, y }) {
  const { bass } = track.features(t)
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 700,
        top: y - 500,
        width: 1400,
        height: 1000,
        background: 'radial-gradient(closest-side, rgba(255,130,40,0.55), transparent)',
        opacity: 0.08 + 0.32 * bass ** 1.5,
      }}
    />
  )
}

// Thin rings that ripple out from the hero on kick drums.
export function BeatRings({ track, t, x, y }) {
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
            border: `${2 - p}px solid rgba(255,170,100,${(0.42 * s * (1 - p) ** 2).toFixed(3)})`,
            pointerEvents: 'none',
          }}
        />
      )
    })
}

// Mirrored spectrum sitting on the progress line: bass in the middle,
// highs at the edges; bars already "played" use the accent colour.
export function Spectrum({ track, t, show }) {
  const { band } = track.features(t)
  const { accent, text } = track.scene.colors
  const n = track.bands * 2
  const left = SPECTRUM_BOX.side
  const width = W - 2 * SPECTRUM_BOX.side
  const step = width / n
  const progress = t / track.duration
  return (
    <div style={{ position: 'absolute', left, width, bottom: SPECTRUM_BOX.bottom, height: 60 }}>
      {show &&
        Array.from({ length: n }, (_, i) => {
          const b = i < track.bands ? track.bands - 1 - i : i - track.bands
          const v = band(b)
          const played = (i + 0.5) / n < progress
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
                background: played ? accent : text,
                opacity: played ? 0.35 + 0.45 * v : 0.1 + 0.18 * v,
              }}
            />
          )
        })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 2, background: 'rgba(247,234,217,0.12)' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: accent, borderRadius: 2 }} />
      </div>
    </div>
  )
}
