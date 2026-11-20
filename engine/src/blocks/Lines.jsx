import { AnimatePresence, motion } from 'framer-motion'
import { useScene } from '../lib/scene.jsx'
import { Words, lineStyle } from './Words.jsx'

/**
 * One line at a time in a box: it comes in, the next one replaces it.
 * Driven by Framer Motion (settles well within the renderer's 4 s warm-up).
 *   box        { left, right, top, bottom | height }
 *   sizes      { size, titleSize }
 *   align      'left' | 'center' | 'right'
 *   hideAfter  hide a line this long after its last word (default: until the next one)
 *   motion     { initial, animate, exit, transition }
 */
export function LineSwap({ box, sizes, align = 'center', lineHeight = 1.12, hideAfter = null, shadow = null, motion: m = RISE_BLUR }) {
  const { t, track, cfg, lyric } = useScene()
  const line = lyric.cur >= 0 ? track.lines[lyric.cur] : null
  const show = line && (hideAfter == null || t < line.e + hideAfter)
  return (
    <div style={{ position: 'absolute', ...box, color: cfg.colors.text }}>
      <AnimatePresence>
        {show && (
          <motion.div
            key={lyric.cur}
            initial={m.initial}
            animate={m.animate}
            exit={m.exit}
            transition={m.transition}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              translate: '0 -50%',
              lineHeight,
              textAlign: align,
              textWrap: 'balance',
              ...(shadow ? { textShadow: shadow } : {}),
              ...lineStyle(cfg, line, sizes),
            }}
          >
            <Words line={line} current />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const RISE_BLUR = {
  initial: { opacity: 0, y: 60, filter: 'blur(14px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -70, filter: 'blur(12px)' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
}

export const SOFT_RISE = {
  initial: { opacity: 0, y: 24, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -24, filter: 'blur(10px)' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
}

/** One line at a time, blurring in from below, left-aligned in 16:9. */
export function SingleLine({ box, size = 82, titleSize = 92 }) {
  const { vertical } = useScene()
  return <LineSwap box={box} sizes={{ size, titleSize }} align={vertical ? 'center' : 'left'} lineHeight={1.12} />
}

/** Short centred line, e.g. over a centred hero in a finale act. */
export function Caption({ box, size = 58 }) {
  return (
    <LineSwap box={box} sizes={{ size, titleSize: size }} lineHeight={1.1} hideAfter={0.9} shadow="0 4px 24px rgba(0,0,0,0.6)" motion={SOFT_RISE} />
  )
}
