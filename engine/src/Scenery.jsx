import { motion } from 'framer-motion'
import { H, W } from './format.js'
import { rng } from './clock.js'

// Background layers shared by the player and the thumbnail.
export function Background({ track, section, t }) {
  return Object.entries(track.scene.palette).map(([key, p]) => (
    <motion.div
      key={key}
      initial={false}
      animate={{ opacity: key === (track.scene.palette[section] ? section : 'verse') ? 1 : 0 }}
      transition={{ duration: 1.6, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(900px 700px at ${30 + Math.sin(t * 0.13) * 12}% ${55 + Math.cos(t * 0.11) * 10}%, ${p.glow}, transparent 70%),
          radial-gradient(800px 600px at ${75 + Math.cos(t * 0.09) * 10}% ${30 + Math.sin(t * 0.07) * 12}%, ${p.glow2}, transparent 70%),
          ${p.base}`,
      }}
    />
  ))
}

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

export function Motes({ track, t }) {
  const sparkle = 0.7 + 0.8 * track.features(t).high
  return MOTES.map((m, i) => {
    const y = (((m.y * H - t * m.speed) % (H + 40)) + H + 40) % (H + 40) - 20
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
          background: '#ffc58a',
          opacity: Math.min(1, m.alpha * sparkle * (0.6 + 0.4 * Math.sin(t * 1.3 + m.phase))),
          filter: m.size > 5 ? 'blur(1.5px)' : 'none',
          boxShadow: '0 0 12px rgba(255,170,90,0.6)',
        }}
      />
    )
  })
}

const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}")`

export function Grain({ t }) {
  const r = rng(Math.floor(t * 12) + 1)
  return (
    <div
      style={{
        position: 'absolute',
        inset: -256,
        backgroundImage: GRAIN,
        opacity: 0.09,
        mixBlendMode: 'overlay',
        transform: `translate(${Math.floor(r() * 256)}px, ${Math.floor(r() * 256)}px)`,
        pointerEvents: 'none',
      }}
    />
  )
}
