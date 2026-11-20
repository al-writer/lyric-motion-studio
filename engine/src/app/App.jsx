import { useEffect, useRef, useState } from 'react'
import { DEBUG, H, RENDER, THUMBNAIL, TRACK, W } from '../lib/params.js'
import { TRACKS, fontsReady, loadTrack } from '../lib/track.js'
import { SceneProvider, useScene } from '../lib/scene.jsx'
import { useClock } from './clock.js'
import Debug from './Debug.jsx'

/** The template's scene (or a custom one) on the stage. */
function Stage({ track, t }) {
  const Scene = track.template.Scene
  return (
    <SceneProvider track={track} t={t}>
      <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', color: track.cfg.colors.text }}>
        <Scene />
        {DEBUG && <Debug />}
      </div>
    </SceneProvider>
  )
}

function useFit() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(RENDER ? 1 : Math.min(innerWidth / W, innerHeight / H))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])
  return scale
}

function Player({ track }) {
  const audioRef = useRef(null)
  const t = useClock(audioRef)
  const [started, setStarted] = useState(RENDER)
  const scale = useFit()

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
          {track.songUrl ? '▶ PLAY' : 'no audio: set "audio" in project.json'}
        </button>
      )}
    </div>
  )
}

function ThumbnailBody({ variant }) {
  const { track, cfg, W, H } = useScene()
  const Custom = track.component(cfg.thumbnails.component)
  const Template = track.template.Thumbnail
  if (Custom) return <Custom track={track} cfg={cfg} variant={variant} W={W} H={H} />
  if (!Template) throw new Error(`template "${track.template.name}" has no thumbnails: set "thumbnails": { "component": "X.jsx" }`)
  return <Template variant={variant} />
}

function ThumbnailPage({ track }) {
  const scale = useFit()
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
      <SceneProvider track={track} t={track.cfg.thumbnails.t ?? 0} poster>
        <ThumbnailBody variant={THUMBNAIL} />
      </SceneProvider>
    </div>
  )
}

function TrackList() {
  const link = { color: '#ffb470', marginRight: 10 }
  return (
    <div style={{ color: '#f7ead9', fontFamily: "'Space Mono', monospace", padding: 40 }}>
      <h1 style={{ fontSize: 22, letterSpacing: '0.2em' }}>LYRIC MOTION STUDIO</h1>
      {TRACKS.map((slug) => (
        <p key={slug}>
          <a style={{ color: '#ff8a2a', marginRight: 10 }} href={`?track=${slug}`}>
            {slug}
          </a>
          <a style={link} href={`?track=${slug}&format=vertical`}>9:16</a>
          <a style={link} href={`?track=${slug}&debug`}>debug</a>· thumbnails:{' '}
          {['hero', 'line', 'macro', 'promo'].map((v) => (
            <a key={v} style={link} href={`?track=${slug}&thumbnail=${v}`}>
              {v}
            </a>
          ))}
        </p>
      ))}
    </div>
  )
}

export default function App() {
  const [track, setTrack] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!TRACK) return
    loadTrack(TRACK)
      .then(async (tr) => {
        await fontsReady(tr.cfg)
        setTrack(tr)
      })
      .catch((e) => {
        console.error(e)
        setError(e.message)
      })
  }, [])
  // the renderer starts once the first frame with real fonts has been drawn
  useEffect(() => {
    if (track && RENDER) requestAnimationFrame(() => (window.__ready = true))
  }, [track])
  if (error) return <pre style={{ color: '#ff8a8a', padding: 40, whiteSpace: 'pre-wrap' }}>{error}</pre>
  if (!TRACK) return <TrackList />
  if (!track) return null
  return THUMBNAIL ? <ThumbnailPage track={track} /> : <Player track={track} />
}
