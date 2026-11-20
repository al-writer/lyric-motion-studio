import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useScene } from '../lib/scene.jsx'
import { hold, loadImage } from '../lib/barrier.js'
import { DPR, FPS, RENDER } from '../lib/params.js'
import { clipsAt, kenBurns, resolveClips, sourceFrame, sourceTime } from '../lib/timeline.js'
import { cssFilter } from './Filters.jsx'

// Video and photo backgrounds.
//
// Render: tools/frames.mjs has extracted the source frames this chunk needs,
// fitted and filtered, into window.__lms.frames/<clip>/<n>.jpg (photos:
// still.jpg). Each render frame draws source frame sourceFrame(clip, t) on a
// canvas at the output resolution and holds the screenshot until it is drawn.
// Preview: a <video> element follows the song, CSS filters approximate the
// baked ones.

const pad = (f) => String(f).padStart(7, '0')
const framesBase = () => window.__lms.frames

function VideoFrames({ clip, media }) {
  const { t, W, H } = useScene()
  const ref = useRef(null)
  // the stage time of this render frame, exactly (t comes in as f / fps)
  const f = sourceFrame(clip, Math.round(t * FPS) / FPS, media)
  useLayoutEffect(() => {
    const canvas = ref.current
    // nothing extracted yet (the page is opened before the first chunk)
    if (!window.__lms?.frames) return
    const src = `${framesBase()}/${clip.i}/${pad(f)}.jpg`
    hold(
      loadImage(src).then(
        (img) => canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height),
        (e) => console.error(e.message)
      )
    )
  }, [clip.i, f])
  return <canvas ref={ref} width={Math.round(W * DPR)} height={Math.round(H * DPR)} style={{ position: 'absolute', inset: 0, width: W, height: H }} />
}

function VideoPreview({ clip, media, filters }) {
  const { t, W, H } = useScene()
  const ref = useRef(null)
  const tau = sourceTime(clip, t, media.duration || Infinity, media.fps || 30)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.playbackRate = clip.speed
    if (Math.abs(v.currentTime - tau) > 0.25) v.currentTime = tau
    if (v.paused) v.play().catch(() => {})
  })
  return (
    <video
      ref={ref}
      src={media.url}
      muted
      playsInline
      loop={clip.loop}
      style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: clip.fit, filter: cssFilter(filters) }}
    />
  )
}

function Photo({ clip, media, filters }) {
  const { t, W, H } = useScene()
  // render: the still is baked at stage aspect x the largest Ken Burns zoom x DPR
  const src = RENDER ? `${framesBase()}/${clip.i}/still.jpg` : media.url
  useMemo(() => RENDER && hold(loadImage(src).catch((e) => console.error(e.message))), [src])
  const p = Math.min(1, Math.max(0, (t - clip.start) / Math.max(0.001, clip.end - clip.start)))
  // the photo covers the stage (cropped to its aspect) and zooms / pans inside it
  const kb = clip.kenBurns ? kenBurns(clip.kenBurns, p, W, H, W, H) : { s: 1, tx: 0, ty: 0 }
  return (
    <img
      src={src}
      alt=""
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W,
        height: H,
        objectFit: clip.fit,
        background: '#000',
        transformOrigin: '0 0',
        transform: `translate(${kb.tx}px, ${kb.ty}px) scale(${kb.s})`,
        filter: RENDER ? 'none' : cssFilter(filters),
      }}
    />
  )
}

/**
 * Background clips (cfg.scene.background) with their transitions.
 *   background  { clips, transition, fit }; filters: cfg.scene.filters
 */
export default function MediaTrack({ background, filters }) {
  const { t, track, cfg } = useScene()
  const clips = useMemo(
    () => resolveClips(background ?? cfg.scene.background, { lines: track.lines, duration: track.duration, media: track.media }),
    [background, cfg, track]
  )
  const base = filters ?? cfg.scene.filters
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
      {clipsAt(clips, t).map(({ clip, opacity }) => {
        const media = track.media[clip.media]
        const f = { ...base, ...clip.filters }
        return (
          <div key={clip.i} style={{ position: 'absolute', inset: 0, opacity }}>
            {clip.kind === 'image' ? (
              <Photo clip={clip} media={media} filters={f} />
            ) : RENDER ? (
              <VideoFrames clip={clip} media={media} />
            ) : (
              <VideoPreview clip={clip} media={media} filters={f} />
            )}
          </div>
        )
      })}
    </div>
  )
}
