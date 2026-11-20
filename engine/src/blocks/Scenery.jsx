import { useScene } from '../lib/scene.jsx'
import { rgba, rng } from '../lib/math.js'

// Atmosphere layers. Everything is a pure function of t.

const MOTES = (() => {
  const r = rng(42)
  return Array.from({ length: 46 }, () => ({
    x: r(),
    y: r(),
    size: 2 + r() * 5,
    speed: 8 + r() * 26,
    sway: 10 + r() * 40,
    phase: r() * Math.PI * 2,
    alpha: 0.15 + r() * 0.45,
  }))
})()

/** Drifting specks of light that sparkle with the high end. */
export function Motes({ color }) {
  const { t, track, cfg, W, H } = useScene()
  const sparkle = 0.7 + 0.8 * track.features(t).high
  return MOTES.map((m, i) => {
    const y = ((((m.y * H - t * m.speed) % (H + 40)) + H + 40) % (H + 40)) - 20
    const x = m.x * W + Math.sin(t * 0.4 + m.phase) * m.sway
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: m.size,
          height: m.size,
          borderRadius: '50%',
          background: color ?? cfg.colors.mote,
          opacity: Math.min(1, m.alpha * sparkle * (0.6 + 0.4 * Math.sin(t * 1.3 + m.phase))),
          filter: m.size > 5 ? 'blur(1.5px)' : 'none',
          boxShadow: `0 0 12px ${rgba(cfg.colors.glow, 0.6)}`,
        }}
      />
    )
  })
}

const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}")`

/** Film grain re-rolled `rate` times a second. */
export function Grain({ opacity = 0.09, rate = 12 }) {
  const { t } = useScene()
  if (!opacity) return null
  const r = rng(Math.floor(t * rate) + 1)
  return (
    <div
      style={{
        position: 'absolute',
        inset: -256,
        backgroundImage: GRAIN,
        opacity,
        mixBlendMode: 'overlay',
        transform: `translate(${Math.floor(r() * 256)}px, ${Math.floor(r() * 256)}px)`,
        pointerEvents: 'none',
      }}
    />
  )
}

/** Darkened edges. */
export function Vignette({ amount = 0.65, inner = 55 }) {
  if (!amount) return null
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at center, transparent ${inner}%, rgba(0,0,0,${amount}) 100%)`,
        pointerEvents: 'none',
      }}
    />
  )
}

/** Fade from and to black at the ends of the song. */
export function Fade({ in: fadeIn = 1.5, out: fadeOut = 2.5, color = '#000' }) {
  const { t, track } = useScene()
  const k = Math.min(1, t / fadeIn, Math.max(0, (track.duration - t) / fadeOut))
  return <div style={{ position: 'absolute', inset: 0, background: color, opacity: 1 - k, pointerEvents: 'none' }} />
}

/** Faint dot grid; a soft spotlight drifts across it and brightens with the energy. */
export function DotGrid() {
  const { t, track } = useScene()
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
