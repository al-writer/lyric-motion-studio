import { motion } from 'framer-motion'
import { useScene } from '../lib/scene.jsx'

// Section-coloured backdrop: two drifting radial glows over a base colour,
// cross-fading when the section changes. cfg.palette[section] = { base, glow, glow2 }.
export default function Palette({ section, palette, fallback = 'verse' }) {
  const s = useScene()
  const pal = palette ?? s.cfg.palette
  const sec = section ?? s.lyric.section
  const t = s.t
  return Object.entries(pal).map(([key, p]) => (
    <motion.div
      key={key}
      initial={false}
      animate={{ opacity: key === (pal[sec] ? sec : fallback) ? 1 : 0 }}
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
