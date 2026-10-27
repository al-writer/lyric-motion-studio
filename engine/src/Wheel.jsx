import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { LYRICS_BOX, WHEEL } from './format.js'
import { Words, lineStyle } from './Words.jsx'

// iPhone-picker style lyric wheel: every line sits on a virtual cylinder and
// the column springs one notch up whenever the next line starts. Long lines
// wrap into two balanced, tight rows.
const R = WHEEL.R // cylinder radius, px
const GAP = WHEEL.gap // space between lines, px
const SCROLL_LEAD = 0.3 // start scrolling this long before the first word

function WheelLine({ track, line, center, y, t, current, measureRef }) {
  // d: distance of this line's centre from the wheel's centre, px
  const d = useTransform(y, (v) => center + v)
  const theta = useTransform(d, (v) => Math.max(-1.45, Math.min(1.45, v / R)))
  const shift = useTransform([d, theta], ([v, a]) => R * Math.sin(a) - v)
  const rotateX = useTransform(theta, (a) => (-a * 180) / Math.PI)
  const scale = useTransform(d, (v) => 0.8 + 0.2 * Math.exp(-((v / 110) ** 2)))
  const opacity = useTransform([d, theta], ([v, a]) =>
    Math.abs(a) >= 1.45 ? 0 : Math.max(0, 0.26 * Math.cos(a) ** 2 + 0.74 * Math.exp(-((v / 85) ** 2)))
  )
  const filter = useTransform(d, (v) => `blur(${Math.min(5, Math.abs(v) / 70).toFixed(2)}px)`)
  return (
    <motion.div
      ref={measureRef}
      style={{
        y: shift,
        rotateX,
        scale,
        opacity,
        filter,
        transformPerspective: 1100,
        textAlign: 'center',
        textWrap: 'balance',
        lineHeight: 1.04,
        marginBottom: GAP,
        ...lineStyle(track, line, WHEEL),
      }}
    >
      <Words track={track} line={line} t={t} current={current} />
    </motion.div>
  )
}

export default function Wheel({ track, t, cur, visible }) {
  const refs = useRef([])
  const [centers, setCenters] = useState(null)

  useLayoutEffect(() => {
    const measure = () => {
      let top = 0
      setCenters(
        refs.current.map((el) => {
          const h = el.offsetHeight
          const c = top + h / 2
          top += h + GAP
          return c
        })
      )
    }
    measure()
    document.fonts.ready.then(measure)
  }, [])

  let focus = 0
  track.lines.forEach((l, i) => l.t - SCROLL_LEAD <= t && (focus = i))

  const y = useSpring(0, { stiffness: 90, damping: 17, mass: 1 })
  const placed = useRef(false)
  useEffect(() => {
    if (!centers) return
    if (placed.current) y.set(-centers[focus])
    else (y.jump(-centers[focus]), (placed.current = true))
  }, [centers, focus, y])

  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        ...LYRICS_BOX,
        color: track.scene.colors.text,
        maskImage: 'linear-gradient(transparent 4%, #000 26%, #000 74%, transparent 96%)',
      }}
    >
      {/* column top sits at the box's vertical centre; lines are shifted by the spring */}
      <motion.div style={{ position: 'absolute', left: 0, right: 0, top: '50%', y }}>
        {track.lines.map((line, i) => (
          <WheelLine
            key={i}
            track={track}
            line={line}
            center={centers?.[i] ?? 0}
            y={y}
            t={t}
            current={i === cur}
            measureRef={(el) => (refs.current[i] = el)}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
