import { useScene } from '../../lib/scene.jsx'
import { rgba } from '../../lib/math.js'
import Lyric from '../../blocks/Lyric.jsx'
import { Fade, Grain, Vignette } from '../../blocks/Scenery.jsx'
import { BassGlow, Spectrum } from '../../blocks/Reactive.jsx'
import { Layers } from '../../blocks/Layers.jsx'

// Minimal: the cover on a blurred copy of itself, title, artist, spectrum.
export function useCoverUrl() {
  const { track, cfg } = useScene()
  const id = cfg.scene.cover.media
  return id ? track.media[id]?.url : track.coverUrl
}

export default function Minimal() {
  const { t, track, cfg, W, H } = useScene()
  const sc = cfg.scene
  const c = sc.cover
  const url = useCoverUrl()
  const { bass } = track.features(t)
  const cx = W / 2 + c.x
  const cy = H / 2 + c.y
  const s = c.size * (1 + 0.02 * bass * bass)
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
      {url && (
        <img
          src={url}
          alt=""
          style={{ position: 'absolute', inset: -c.backdropBlur * 2, width: W + c.backdropBlur * 4, height: H + c.backdropBlur * 4, objectFit: 'cover', filter: `blur(${c.backdropBlur}px)`, opacity: 1 - c.backdropDim }}
        />
      )}
      <Layers z="background" />
      <BassGlow x={cx} y={cy} />
      <div
        style={{
          position: 'absolute',
          left: cx - s / 2,
          top: cy - s / 2,
          width: s,
          height: s,
          borderRadius: c.radius,
          overflow: 'hidden',
          boxShadow: `0 40px 80px rgba(0,0,0,0.55), 0 0 120px ${rgba(cfg.colors.glow, 0.2 + 0.3 * bass)}`,
          background: `linear-gradient(135deg, ${cfg.colors.accent}, #222)`,
        }}
      >
        {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <Layers z="above-hero" />
      {sc.title.show && (
        <div style={{ position: 'absolute', ...sc.title.box, textAlign: sc.title.align, color: cfg.colors.text }}>
          <div style={{ fontFamily: `'${cfg.fonts.body}', serif`, fontWeight: 600, fontSize: sc.title.size, lineHeight: 1.05, letterSpacing: '-0.01em', textWrap: 'balance' }}>{cfg.title}</div>
          <div style={{ marginTop: 14, fontFamily: `'${cfg.fonts.display}', monospace`, fontSize: sc.title.artistSize, letterSpacing: '0.4em', textTransform: 'uppercase', color: cfg.colors.accentSoft }}>
            {cfg.artist}
          </div>
        </div>
      )}
      {sc.lyrics.show && <Lyric {...sc.lyrics} />}
      <Layers z="above-lyrics" />
      <Spectrum box={sc.spectrum.box} style={sc.spectrum.style} bars={sc.spectrum.show} progress={sc.spectrum.progress} />
      <Vignette amount={0.5} />
      <Grain opacity={sc.grain} />
      <Layers z="top" />
      <Fade in={sc.fade.in} out={sc.fade.out} />
    </>
  )
}
