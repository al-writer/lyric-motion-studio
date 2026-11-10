import { useEffect, useMemo, useRef, useState } from 'react'
import { RENDER, THUMBNAIL, TRACK } from './params.js'
import { TRACKS, fontsReady, isEmphasis, isPop, loadTrack } from './track.js'
import { H, W } from './format.js'
import { useClock } from './clock.js'
import Hero from './Hero.jsx'
import Wheel from './Wheel.jsx'
import SingleLine from './SingleLine.jsx'
import { DotGrid, Spectrum } from './Reactive.jsx'
import { Background, Grain, Motes } from './Scenery.jsx'
import Thumbnail from './Thumbnail.jsx'

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

function Stage({ track, t }) {
  const { cur, section, pose, showCredits } = useStageState(track, t)
  const { scene } = track
  const r = scene.reactive
  const fade = Math.min(1, t / scene.fadeIn, Math.max(0, (track.duration - t) / scene.fadeOut))
  if (track.Stage) {
    const Custom = track.Stage
    return (
      <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', color: scene.colors.text }}>
        <Custom track={track} t={t} cur={cur} section={section} W={W} H={H} />
        <Grain t={t} />
        <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: 1 - fade, pointerEvents: 'none' }} />
      </div>
    )
  }
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
    if (RENDER) fontsReady(track.scene).then(() => (window.__ready = true))
  }, [track])

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
          · thumbnails:{' '}
          {['hero', 'line', 'macro'].map((v) => (
            <a key={v} style={{ color: '#ffb470', marginRight: 8 }} href={`?track=${slug}&thumbnail=${v}`}>
              {v}
            </a>
          ))}
        </p>
      ))}
    </div>
  )
}

function ThumbnailPage({ track }) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (RENDER) fontsReady(track.scene).then(() => (window.__ready = true))
    else setScale(Math.min(innerWidth / W, innerHeight / H))
  }, [])
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
      <Thumbnail track={track} variant={THUMBNAIL} />
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
  if (track && THUMBNAIL) return <ThumbnailPage track={track} />
  return track ? (
    <Player track={{ ...track, lines: track.lines.map((l) => ({ ...l, emphasis: isEmphasis(track, l), pop: isPop(track, l) })) }} />
  ) : null
}
