import { AnimatePresence, motion } from 'framer-motion'
import { useScene, slotProps } from '../lib/scene.jsx'
import { rgba } from '../lib/math.js'
import { BassGlow, BeatRings } from './Reactive.jsx'

/** Cover art from the audio file (build/cover.jpg), or a title card without one. */
export function Cover({ radius = 28 }) {
  const { track, cfg } = useScene()
  return track.coverUrl ? (
    <img src={track.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius, display: 'block' }} />
  ) : (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        background: `linear-gradient(135deg, ${cfg.colors.accent}, #2a1408)`,
        display: 'grid',
        placeItems: 'center',
        color: cfg.colors.text,
        fontFamily: `'${cfg.fonts.display}', monospace`,
        fontWeight: 700,
        fontSize: 48,
        textAlign: 'center',
        padding: 40,
        boxSizing: 'border-box',
      }}
    >
      {cfg.title}
    </div>
  )
}

/** Box of the hero: its component's "size" (default 900x450), or 560x560 for the cover. */
export function heroSize(track, hero) {
  return hero?.component && track.component(hero.component) ? hero.size ?? [900, 450] : [560, 560]
}

/** The hero's art: the project's component or the cover. */
export function HeroArt({ hero }) {
  const s = useScene()
  const Custom = hero?.component ? s.track.component(hero.component) : null
  return Custom ? <Custom {...slotProps(s)} /> : <Cover />
}

/**
 * The central object, springing between poses.
 *   hero      cfg.scene.hero: { component, size, poses: { name: {x,y,scale,rotate} }, spring, float, tilt, glow }
 *   pose      pose name (default: the director's)
 *   rings     ripple rings on kicks
 *   credits   artist under the hero
 */
export default function Hero({ hero, pose, rings = false, credits }) {
  const s = useScene()
  const { t, track, cfg } = s
  if (!hero || hero.type === 'none') return null
  const [w, h] = heroSize(track, hero)
  const k = Math.sqrt((900 * 450) / (w * h)) // same visual weight as the 900x450 reference
  const target = hero.poses[pose ?? s.dir.pose] ?? hero.poses.center
  const { bass, energy } = track.features(t)
  const showCredits = credits ?? s.lyric.credits
  return (
    <motion.div
      initial={false}
      animate={{ ...target, scale: target.scale * k }}
      transition={{ type: 'spring', ...(hero.spring ?? { stiffness: 38, damping: 14, mass: 1.2 }) }}
      style={{ position: 'absolute', left: `calc(50% - ${w / 2}px)`, top: `calc(50% - ${h / 2}px)`, width: w, height: h }}
    >
      {hero.glow !== false && <BassGlow x={w / 2} y={h / 2} />}
      {rings && <BeatRings x={w / 2} y={h / 2} />}
      <div
        style={{
          width: '100%',
          height: '100%',
          // slow float and 3D tilt, plus a small "breath" on the bass
          transform: `perspective(1400px) translateY(${Math.sin(t * 0.8) * 12}px) rotate(${Math.sin(t * 0.55) * 2.2}deg)${
            hero.tilt !== false ? ` rotateY(${Math.sin(t * 0.37) * 9}deg) rotateX(${Math.sin(t * 0.29 + 1) * 6}deg) scale(${1 + 0.028 * bass ** 2})` : ''
          }`,
          filter: `drop-shadow(0 30px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 ${50 + 40 * energy}px ${rgba(cfg.colors.glow, 0.15 + 0.3 * energy)})`,
        }}
      >
        <HeroArt hero={hero} />
      </div>
      <AnimatePresence>
        {showCredits && cfg.artist && (
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
              fontFamily: `'${cfg.fonts.display}', monospace`,
              letterSpacing: '0.5em',
              fontSize: 26,
              color: cfg.colors.text,
              textTransform: 'uppercase',
            }}
          >
            {cfg.artist}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
