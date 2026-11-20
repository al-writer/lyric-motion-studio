import { AnimatePresence, motion } from 'framer-motion'
import { CAPTION_BOX } from './format.js'
import { Words, lineStyle } from './Words.jsx'

// Finale lyrics: one short line at a time, smaller, above the centred hero.
export default function Caption({ track, t, cur }) {
  const line = cur >= 0 ? track.lines[cur] : null
  const show = line && t < line.e + 0.9
  const { size, ...box } = CAPTION_BOX
  return (
    <div style={{ position: 'absolute', ...box, color: track.scene.colors.text }}>
      <AnimatePresence>
        {show && (
          <motion.div
            key={cur}
            initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -24, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              translate: '0 -50%',
              lineHeight: 1.1,
              textAlign: 'center',
              textWrap: 'balance',
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
              ...lineStyle(track, line, { size, titleSize: size }),
            }}
          >
            <Words track={track} line={line} t={t} current />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
