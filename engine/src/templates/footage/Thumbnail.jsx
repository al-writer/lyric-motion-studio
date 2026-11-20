import { useScene } from '../../lib/scene.jsx'
import { rgba } from '../../lib/math.js'
import { Picture } from './Scene.jsx'
import { Vignette } from '../../blocks/Scenery.jsx'

// Footage covers: the background at thumbnails.t with a big line over it.
//   line  - the lyric line set big (default)
//   title - the song title and artist
// "thumbnails": { "t": 60, "line": "…", "highlight": "word", "tag": "Lyric video" }
export default function Thumbnail({ variant }) {
  const { cfg, W, H, vertical } = useScene()
  const th = cfg.thumbnails
  const { fonts, colors } = cfg
  const text = variant === 'title' ? cfg.title : th.line ?? cfg.title
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#000' }}>
      <Picture />
      <Vignette amount={0.75} inner={35} />
      <div
        style={{
          position: 'absolute',
          left: vertical ? 70 : 110,
          right: vertical ? 120 : 520,
          top: vertical ? 520 : 0,
          bottom: vertical ? 600 : 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: vertical ? 'center' : 'flex-start',
          textAlign: vertical ? 'center' : 'left',
          color: colors.text,
          textShadow: '0 6px 40px rgba(0,0,0,0.7)',
        }}
      >
        {th.tag && (
          <div style={{ fontFamily: `'${fonts.display}', monospace`, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: colors.accent, fontSize: 36, marginBottom: 30 }}>
            {th.tag}
          </div>
        )}
        <div style={{ fontFamily: `'${fonts.body}', serif`, fontWeight: 600, fontSize: vertical ? 132 : 140, lineHeight: 1.0, letterSpacing: '-0.02em', textWrap: 'balance' }}>
          {text.split(' ').map((w, i) => (
            <span key={i}>
              {i > 0 && ' '}
              {th.highlight && w.toLowerCase().includes(th.highlight.toLowerCase()) ? (
                <span style={{ color: colors.accentSoft, fontStyle: 'italic', textShadow: `0 0 50px ${rgba(colors.glow, 0.9)}` }}>{w}</span>
              ) : (
                w
              )}
            </span>
          ))}
        </div>
        {variant !== 'title' && (
          <div style={{ marginTop: 40, fontFamily: `'${fonts.display}', monospace`, fontSize: 30, letterSpacing: '0.4em', textTransform: 'uppercase', opacity: 0.9 }}>
            {cfg.artist} — {cfg.title}
          </div>
        )}
      </div>
    </div>
  )
}
