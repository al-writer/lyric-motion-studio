import { motion } from 'framer-motion'

// Word-by-word highlight shared by both lyric layouts.
export function lineStyle(track, line, { size, titleSize }) {
  const { fonts } = track.scene
  if (line.emphasis)
    return { fontFamily: `'${fonts.display}', monospace`, fontWeight: 700, fontSize: titleSize, letterSpacing: '0.03em', textTransform: 'uppercase' }
  return {
    fontFamily: `'${fonts.body}', serif`,
    fontWeight: 520,
    fontStyle: track.scene.italicSections.includes(line.section) ? 'italic' : 'normal',
    fontSize: size,
    letterSpacing: '-0.015em',
  }
}

const glow = (a) => `0 0 26px rgba(255,138,42,${a})`

export function Words({ track, line, t, current }) {
  const { text, accent, accentSoft } = track.scene.colors
  const base = line.emphasis ? accent : text
  const variants = {
    future: { opacity: 0.25, y: 0, color: base, textShadow: glow(0) },
    active: { opacity: 1, y: -6, color: accentSoft, textShadow: glow(0.85) },
    past: { opacity: 1, y: 0, color: base, textShadow: glow(0) },
  }
  let active = -1
  if (current) line.words.forEach((w, i) => w.t <= t && (active = i))
  return line.words.map((w, i) => {
    const state = !current ? 'past' : i < active ? 'past' : i === active ? (t < w.e + 0.15 ? 'active' : 'past') : 'future'
    return (
      <span key={i}>
        {i > 0 && ' '}
        <motion.span
          initial={false}
          variants={variants}
          animate={state}
          transition={line.pop ? { type: 'spring', stiffness: 420, damping: 18 } : { duration: 0.28, ease: 'easeOut' }}
          style={{ display: 'inline-block' }}
        >
          {w.w}
        </motion.span>
      </span>
    )
  })
}
