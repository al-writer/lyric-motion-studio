import { motion } from 'framer-motion'
import { useScene } from '../lib/scene.jsx'
import { clamp, rgba } from '../lib/math.js'

/**
 * Typography of a line: emphasis lines in the display font, uppercase, accent;
 * others in the body font, italic in cfg.lyrics.italicSections.
 * sizes: { size, titleSize }
 */
export function lineStyle(cfg, line, { size, titleSize }) {
  const { fonts } = cfg
  if (line.emphasis)
    return { fontFamily: `'${fonts.display}', monospace`, fontWeight: 700, fontSize: titleSize, letterSpacing: '0.03em', textTransform: 'uppercase' }
  return {
    fontFamily: `'${fonts.body}', serif`,
    fontWeight: 520,
    fontStyle: cfg.lyrics.italicSections.includes(line.section) ? 'italic' : 'normal',
    fontSize: size,
    letterSpacing: '-0.015em',
  }
}

/**
 * The words of a line with the highlight (cfg.lyrics.highlight unless given):
 *   word  karaoke: each word lights up as it is sung
 *   line  the whole current line lights up
 *   wipe  colour fills each word left to right while it is sung (pure function of t)
 *   none  plain text
 */
export function Words({ line, current, highlight }) {
  const { t, cfg } = useScene()
  const mode = highlight ?? cfg.lyrics.highlight
  const { text, accent, accentSoft } = cfg.colors
  const base = line.emphasis ? accent : text
  const halo = (a) => `0 0 26px ${rgba(cfg.colors.glow, a)}`
  if (mode === 'none') return line.words.map((w) => w.w).join(' ')
  if (mode === 'wipe')
    return line.words.map((w, i) => {
      const p = current ? clamp((t - w.t) / Math.max(0.05, w.e - w.t)) : t > w.e ? 1 : 0
      return (
        <span key={i}>
          {i > 0 && ' '}
          <span
            style={{
              display: 'inline-block',
              backgroundImage: `linear-gradient(90deg, ${accentSoft} ${p * 100}%, ${base} ${p * 100}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {w.w}
          </span>
        </span>
      )
    })
  const variants = {
    future: { opacity: 0.25, y: 0, color: base, textShadow: halo(0) },
    active: { opacity: 1, y: -6, color: accentSoft, textShadow: halo(0.85) },
    past: { opacity: 1, y: 0, color: base, textShadow: halo(0) },
    line: { opacity: 1, y: 0, color: accentSoft, textShadow: halo(0.6) },
  }
  if (mode === 'line')
    return line.words.map((w, i) => (
      <span key={i}>
        {i > 0 && ' '}
        <motion.span
          initial={false}
          variants={variants}
          animate={current ? 'line' : 'past'}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ display: 'inline-block' }}
        >
          {w.w}
        </motion.span>
      </span>
    ))
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
