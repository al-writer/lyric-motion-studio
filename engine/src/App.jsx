import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { RENDER, TRACK } from './params.js'
import { TRACKS, isEmphasis, isPop, loadTrack } from './track.js'
import { H, W } from './format.js'
import { rng, useClock } from './clock.js'
import Hero from './Hero.jsx'
import Wheel from './Wheel.jsx'
import SingleLine from './SingleLine.jsx'
import { DotGrid, Spectrum } from './Reactive.jsx'

const LEAD = 0.45 // a line becomes current this long before its first word
const HOLD = 2.4 // and stays current at most this long after its last word
const CREDITS_LEAD = 1.5 // credits leave this long before the first line

function useStageState(track, t) {
  return useMemo(() => {
    const { lines } = track
    let last = -1
    for (let i = 0; i < lines.length; i++) if (lines[i].t - LEAD <= t) last = i
    let cur = -1
    if (last >= 0) {
      const next = lines[last + 1]
      const until = Math.min(next ? next.t - LEAD : Infinity, lines[last].e + HOLD)
      if (t < until) cur = last
    }
    const next = lines[last + 1]
    const gapAhead = next ? next.t - t : Infinity
    const ended = last === lines.length - 1 && cur < 0
    const section = last >= 0 ? (ended ? 'outro' : lines[last].section) : 'intro'

    let pose = section === 'chorus' || section === 'outro' ? 'chorus' : 'side'
    if (cur < 0 && gapAhead > 3) pose = 'center'
    const showCredits = t < lines[0].t - CREDITS_LEAD || (ended && t > lines.at(-1).e + 2)
    return { cur, section, pose, showCredits }
  }, [track, t])
}

function Background({ track, section, t }) {
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

function Motes({ track, t }) {
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

function Grain({ t }) {
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

function Stage({ track, t }) {
  const { cur, section, pose, showCredits } = useStageState(track, t)
  const { scene } = track
  const r = scene.reactive
  const fade = Math.min(1, t / scene.fadeIn, Math.max(0, (track.duration - t) / scene.fadeOut))
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', color: scene.colors.text }}>
      <Background track={track} section={section} t={t} />
      {r.dots && <DotGrid track={track} t={t} />}
      {r.motes && <Motes track={track} t={t} />}
      <Hero track={track} t={t} pose={pose} showCredits={showCredits} rings={cur >= 0 && r.rings.includes(section)} />
      {scene.layout === 'single' ? (
        <SingleLine track={track} t={t} cur={cur} />
      ) : (
        <Wheel track={track} t={t} cur={cur} visible={pose !== 'center'} />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Grain t={t} />
      <Spectrum track={track} t={t} show={r.spectrum} />
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: 1 - fade, pointerEvents: 'none' }} />
    </div>
  )
}

function Player({ track }) {
  const audioRef = useRef(null)
  const t = useClock(audioRef)
  const [started, setStarted] = useState(RENDER)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const fit = () => setScale(RENDER ? 1 : Math.min(innerWidth / W, innerHeight / H))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (RENDER) document.fonts.ready.then(() => (window.__ready = true))
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', background: '#000' }}>
      <div style={{ width: W * scale, height: H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Stage track={track} t={t} />
        </div>
      </div>
      {!RENDER && <audio ref={audioRef} src={track.songUrl} />}
      {!started && (
        <button
          onClick={() => (setStarted(true), audioRef.current.play())}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            color: '#f7ead9',
            border: 0,
            fontFamily: "'Space Mono', monospace",
            fontSize: 28,
            letterSpacing: '0.3em',
            cursor: 'pointer',
          }}
        >
          ▶ PLAY
        </button>
      )}
    </div>
  )
}

function TrackList() {
  return (
    <div style={{ color: '#f7ead9', fontFamily: "'Space Mono', monospace", padding: 40 }}>
      <h1 style={{ fontSize: 22, letterSpacing: '0.2em' }}>LYRIC MOTION STUDIO</h1>
      {TRACKS.map((slug) => (
        <p key={slug}>
          <a style={{ color: '#ff8a2a' }} href={`?track=${slug}`}>
            {slug}
          </a>{' '}
          · <a style={{ color: '#ffb470' }} href={`?track=${slug}&format=vertical`}>9:16</a>
        </p>
      ))}
    </div>
  )
}

export default function App() {
  const [track, setTrack] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (TRACK) loadTrack(TRACK).then(setTrack, (e) => setError(e.message))
  }, [])
  if (error) return <pre style={{ color: '#ff8a8a', padding: 40, whiteSpace: 'pre-wrap' }}>{error}</pre>
  if (!TRACK) return <TrackList />
  return track ? (
    <Player track={{ ...track, lines: track.lines.map((l) => ({ ...l, emphasis: isEmphasis(track, l), pop: isPop(track, l) })) }} />
  ) : null
}
