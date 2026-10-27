import { AnimatePresence, motion } from 'framer-motion'
import { HERO_POSE } from './format.js'
import { BassGlow, BeatRings } from './Reactive.jsx'

// The central object: a track's own component (scene/<file>.jsx, drawn in a
// 900x450 box) or, by default, the cover art embedded in the audio file.
function Cover({ track }) {
  return track.coverUrl ? (
    <img src={track.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 28, display: 'block' }} />
  ) : (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 28,
        background: `linear-gradient(135deg, ${track.scene.colors.accent}, #2a1408)`,
        display: 'grid',
        placeItems: 'center',
        color: track.scene.colors.text,
        fontFamily: `'${track.scene.fonts.display}', monospace`,
        fontWeight: 700,
        fontSize: 48,
        textAlign: 'center',
        padding: 40,
        boxSizing: 'border-box',
      }}
    >
      {track.scene.title}
    </div>
  )
}

export default function Hero({ track, t, pose, showCredits, rings }) {
  const { scene } = track
  if (scene.hero.type === 'none') return null
  const custom = scene.hero.type === 'component' && track.Hero
  const [w, h] = custom ? scene.hero.size ?? [900, 450] : [560, 560]
  const k = Math.sqrt((900 * 450) / (w * h)) // same visual weight as the 900x450 reference
  const target = HERO_POSE[pose]
  const { bass, energy } = track.features(t)
  const r = scene.reactive
  const Custom = track.Hero
  return (
    <motion.div
      initial={false}
      animate={{ ...target, scale: target.scale * k }}
      transition={{ type: 'spring', stiffness: 38, damping: 14, mass: 1.2 }}
      style={{ position: 'absolute', left: `calc(50% - ${w / 2}px)`, top: `calc(50% - ${h / 2}px)`, width: w, height: h }}
    >
      {r.glow && <BassGlow track={track} t={t} x={w / 2} y={h / 2} />}
      {rings && <BeatRings track={track} t={t} x={w / 2} y={h / 2} />}
      <div
        style={{
          width: '100%',
          height: '100%',
          // slow float and 3D tilt, plus a small "breath" on the bass
          transform: `perspective(1400px) translateY(${Math.sin(t * 0.8) * 12}px) rotate(${Math.sin(t * 0.55) * 2.2}deg)${
            r.tilt ? ` rotateY(${Math.sin(t * 0.37) * 9}deg) rotateX(${Math.sin(t * 0.29 + 1) * 6}deg) scale(${1 + 0.028 * bass ** 2})` : ''
          }`,
          filter: `drop-shadow(0 30px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 ${50 + 40 * energy}px rgba(255,120,30,${(0.15 + 0.3 * energy).toFixed(3)}))`,
        }}
      >
        {custom ? <Custom scene={scene} t={t} /> : <Cover track={track} />}
      </div>
      <AnimatePresence>
        {showCredits && scene.artist && (
          <motion.div
            key="credits"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.85, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: h + 20,
              width: '100%',
              textAlign: 'center',
              fontFamily: `'${scene.fonts.display}', monospace`,
              letterSpacing: '0.5em',
              fontSize: 26,
              color: scene.colors.text,
              textTransform: 'uppercase',
            }}
          >
            {scene.artist}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
