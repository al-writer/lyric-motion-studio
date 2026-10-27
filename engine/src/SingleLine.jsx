import { AnimatePresence, motion } from 'framer-motion'
import { LYRICS_BOX, WHEEL } from './format.js'
import { Words, lineStyle } from './Words.jsx'

// One line at a time: it blurs in from below and leaves upwards.
export default function SingleLine({ track, t, cur }) {
  const line = cur >= 0 ? track.lines[cur] : null
  return (
    <div style={{ position: 'absolute', ...LYRICS_BOX, color: track.scene.colors.text }}>
      <AnimatePresence>
        {line && (
          <motion.div
            key={cur}
            initial={{ opacity: 0, y: 60, filter: 'blur(14px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -70, filter: 'blur(12px)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              translate: '0 -50%',
              lineHeight: 1.12,
              textAlign: track.vertical ? 'center' : 'left',
              textWrap: 'balance',
              ...lineStyle(track, line, { size: WHEEL.size + 8, titleSize: WHEEL.titleSize + 22 }),
            }}
          >
            <Words track={track} line={line} t={t} current />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
