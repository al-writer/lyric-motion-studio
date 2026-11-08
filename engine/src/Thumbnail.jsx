import { Cover } from './Hero.jsx'
import { Background, Grain, Motes } from './Scenery.jsx'
import { H, W } from './format.js'
import { VERTICAL } from './params.js'

// YouTube thumbnails (1920x1080, rendered by `tools/render.mjs --thumbnail`;
// with --format vertical, 1080x1920 covers for Shorts, see VerticalVariant).
// Three variants for YouTube's "Test & Compare":
//   hero  - the hero object large, glowing, with a small "lyric video" label
//   line  - one lyric line set big, the hero beside it
//   macro - a tight, cropped close-up of the hero with a label
// Text is kept away from the bottom-right corner, where YouTube draws the duration.
// scene.json "thumbnail": { "line": "...", "highlight": "word", "tag": "LYRIC VIDEO", "t": 66 }
//   promo  - marketing cover: a hook line, a release badge, the hero, artist and
//            title (scene.json "promo": { "hook": "...", "highlight": ["words"], "badge": "..." }).
//            The vertical one keeps everything inside the centre 3:4, the part
//            TikTok shows in profile grids.

function HeroArt({ track, w, h }) {
  const Custom = track.Hero
  return (
    <div style={{ width: w, height: h, filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.6)) drop-shadow(0 0 120px rgba(255,120,30,0.55))' }}>
      {Custom ? <Custom scene={track.scene} t={0} /> : <Cover track={track} />}
    </div>
  )
}

function Glow({ x, y, size = 1300, alpha = 0.6 }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size * 0.4,
        width: size,
        height: size * 0.8,
        background: `radial-gradient(closest-side, rgba(255,130,40,${alpha}), transparent)`,
      }}
    />
  )
}

function Rings({ x, y }) {
  return [560, 820, 1100].map((d, i) => (
    <div
      key={d}
      style={{
        position: 'absolute',
        left: x - d / 2,
        top: y - d / 2,
        width: d,
        height: d,
        borderRadius: '50%',
        border: `2px solid rgba(255,170,100,${0.28 - i * 0.08})`,
      }}
    />
  ))
}

function Tag({ track, children, style }) {
  const { fonts, colors } = track.scene
  return (
    <div
      style={{
        fontFamily: `'${fonts.display}', monospace`,
        fontWeight: 700,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        color: colors.accent,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Artist({ track, style }) {
  const { fonts, colors, artist } = track.scene
  return (
    <div
      style={{
        fontFamily: `'${fonts.display}', monospace`,
        letterSpacing: '0.45em',
        textTransform: 'uppercase',
        color: colors.text,
        opacity: 0.9,
        ...style,
      }}
    >
      {artist}
    </div>
  )
}

function heroBox(track) {
  return track.Hero ? track.scene.hero.size ?? [900, 450] : [560, 560]
}

function HeroVariant({ track, tag }) {
  const [w, h] = heroBox(track)
  const k = 1180 / w
  return (
    <>
      <Glow x={980} y={470} size={1600} alpha={0.65} />
      <Rings x={980} y={450} />
      <div style={{ position: 'absolute', left: 980 - w / 2, top: 450 - h / 2, transform: `scale(${k}) rotate(-7deg)` }}>
        <HeroArt track={track} w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 110, bottom: 96 }}>
        <Tag track={track} style={{ fontSize: 46 }}>{tag}</Tag>
        <Artist track={track} style={{ fontSize: 34, marginTop: 18 }} />
      </div>
    </>
  )
}

function LineVariant({ track, tag, line, highlight }) {
  const { fonts, colors } = track.scene
  const [w, h] = heroBox(track)
  const k = 760 / w
  const words = line.split(' ')
  return (
    <>
      <Glow x={1460} y={560} size={1200} alpha={0.55} />
      <div style={{ position: 'absolute', left: 1480 - w / 2, top: 560 - h / 2, transform: `scale(${k}) rotate(-12deg)` }}>
        <HeroArt track={track} w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 110, top: 150, width: 1040 }}>
        <Tag track={track} style={{ fontSize: 36, marginBottom: 34 }}>{tag}</Tag>
        <div
          style={{
            fontFamily: `'${fonts.body}', serif`,
            fontWeight: 600,
            fontSize: 150,
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            color: colors.text,
            textWrap: 'balance',
            textShadow: '0 6px 30px rgba(0,0,0,0.6)',
          }}
        >
          {words.map((wd, i) => (
            <span key={i}>
              {i > 0 && ' '}
              {wd.toLowerCase() === highlight?.toLowerCase() ? (
                <span style={{ color: colors.accentSoft, fontStyle: 'italic', textShadow: '0 0 50px rgba(255,138,42,0.9)' }}>{wd}</span>
              ) : (
                wd
              )}
            </span>
          ))}
        </div>
        <Artist track={track} style={{ fontSize: 32, marginTop: 44 }} />
      </div>
    </>
  )
}

function MacroVariant({ track, tag }) {
  const [w, h] = heroBox(track)
  const k = 2050 / w
  return (
    <>
      <Glow x={960} y={540} size={2000} alpha={0.5} />
      <div style={{ position: 'absolute', left: 1240 - w / 2, top: 560 - h / 2, transform: `scale(${k}) rotate(-6deg)` }}>
        <HeroArt track={track} w={w} h={h} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 80,
          padding: '18px 34px',
          borderRadius: 999,
          background: track.scene.colors.text,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <Tag track={track} style={{ fontSize: 40, color: '#1a0c06', letterSpacing: '0.28em' }}>{tag}</Tag>
      </div>
    </>
  )
}

// 9:16 cover for Shorts. Everything sits in the upper two thirds: the Shorts
// player covers the bottom with the title and channel, the right edge with
// buttons. "line" sets the lyric line under the hero; "hero" stands the hero
// upright and large.
function VerticalVariant({ track, tag, line, highlight, withLine }) {
  const { fonts, colors } = track.scene
  const [w, h] = heroBox(track)
  const words = line.split(' ')
  if (!withLine)
    return (
      <>
        <Glow x={520} y={980} size={1500} alpha={0.6} />
        <Rings x={520} y={980} />
        <div style={{ position: 'absolute', left: 520 - w / 2, top: 980 - h / 2, transform: `scale(${1250 / w}) rotate(-78deg)` }}>
          <HeroArt track={track} w={w} h={h} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 60, top: 110, textAlign: 'center' }}>
          <Tag track={track} style={{ fontSize: 40 }}>{tag}</Tag>
          <Artist track={track} style={{ fontSize: 30, marginTop: 16 }} />
        </div>
      </>
    )
  return (
    <>
      <Glow x={520} y={560} size={1300} alpha={0.6} />
      <div style={{ position: 'absolute', left: 520 - w / 2, top: 520 - h / 2, transform: `scale(${930 / w}) rotate(-8deg)` }}>
        <HeroArt track={track} w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 60, right: 100, top: 880, textAlign: 'center' }}>
        <Tag track={track} style={{ fontSize: 34, marginBottom: 30 }}>{tag}</Tag>
        <div
          style={{
            fontFamily: `'${fonts.body}', serif`,
            fontWeight: 600,
            fontSize: 140,
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            color: colors.text,
            textWrap: 'balance',
            textShadow: '0 6px 30px rgba(0,0,0,0.6)',
          }}
        >
          {words.map((wd, i) => (
            <span key={i}>
              {i > 0 && ' '}
              {wd.toLowerCase() === highlight?.toLowerCase() ? (
                <span style={{ color: colors.accentSoft, fontStyle: 'italic', textShadow: '0 0 50px rgba(255,138,42,0.9)' }}>{wd}</span>
              ) : (
                wd
              )}
            </span>
          ))}
        </div>
        <Artist track={track} style={{ fontSize: 30, marginTop: 40 }} />
      </div>
    </>
  )
}

function Hook({ track, text, highlight = [], size, align }) {
  const { fonts, colors } = track.scene
  const hl = new Set(highlight.map((w) => w.toLowerCase()))
  return (
    <div
      style={{
        fontFamily: `'${fonts.body}', serif`,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: '-0.02em',
        color: colors.text,
        textAlign: align,
        textWrap: 'balance',
        textShadow: '0 6px 30px rgba(0,0,0,0.6)',
      }}
    >
      {text.split(' ').map((wd, i) => (
        <span key={i}>
          {i > 0 && ' '}
          {hl.has(wd.toLowerCase().replace(/[^\w']/g, '')) ? (
            <span style={{ color: colors.accentSoft, fontStyle: 'italic', textShadow: '0 0 50px rgba(255,138,42,0.9)' }}>{wd}</span>
          ) : (
            wd
          )}
        </span>
      ))}
    </div>
  )
}

function Badge({ track, children, size }) {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: `${size * 0.42}px ${size * 0.9}px`,
        borderRadius: 999,
        background: track.scene.colors.accent,
        boxShadow: '0 10px 40px rgba(255,120,30,0.45)',
      }}
    >
      <Tag track={track} style={{ fontSize: size, color: '#1a0c06', letterSpacing: '0.24em' }}>
        {children}
      </Tag>
    </div>
  )
}

function Credit({ track, size }) {
  const { fonts, colors, artist, title } = track.scene
  return (
    <div style={{ fontFamily: `'${fonts.display}', monospace`, textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: size }}>
      <span style={{ color: colors.text }}>{artist}</span>
      <span style={{ color: colors.accent }}> — {title}</span>
    </div>
  )
}

function PromoVariant({ track, hook, highlight, badge }) {
  const [w, h] = heroBox(track)
  if (VERTICAL)
    return (
      <>
        <Glow x={520} y={1180} size={1300} alpha={0.6} />
        <Rings x={520} y={1180} />
        <div style={{ position: 'absolute', left: 0, right: 40, top: 330, textAlign: 'center' }}>
          <Badge track={track} size={30}>{badge}</Badge>
        </div>
        <div style={{ position: 'absolute', left: 70, right: 110, top: 470 }}>
          <Hook track={track} text={hook} highlight={highlight} size={118} align="center" />
        </div>
        <div style={{ position: 'absolute', left: 520 - w / 2, top: 1180 - h / 2, transform: `scale(${860 / w}) rotate(-9deg)` }}>
          <HeroArt track={track} w={w} h={h} />
        </div>
        <div style={{ position: 'absolute', left: 40, right: 80, top: 1540, textAlign: 'center' }}>
          <Credit track={track} size={26} />
        </div>
      </>
    )
  return (
    <>
      <Glow x={1440} y={560} size={1200} alpha={0.6} />
      <Rings x={1440} y={540} />
      <div style={{ position: 'absolute', left: 1440 - w / 2, top: 540 - h / 2, transform: `scale(${780 / w}) rotate(-10deg)` }}>
        <HeroArt track={track} w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 110, top: 150, width: 980 }}>
        <Badge track={track} size={30}>{badge}</Badge>
        <div style={{ marginTop: 50 }}>
          <Hook track={track} text={hook} highlight={highlight} size={128} align="left" />
        </div>
        <div style={{ marginTop: 56 }}>
          <Credit track={track} size={28} />
        </div>
      </div>
    </>
  )
}

export default function Thumbnail({ track, variant }) {
  const cfg = { tag: 'Lyric video', line: track.scene.title, t: 66, ...track.scene.thumbnail }
  const t = cfg.t
  const promo = { badge: 'New song · out now', hook: track.scene.title, highlight: [], ...track.scene.promo }
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#000' }}>
      <Background track={track} section="chorus" t={t} />
      <Motes track={track} t={t} />
      {variant === 'promo' ? (
        <PromoVariant track={track} hook={promo.hook} highlight={promo.highlight} badge={promo.badge} />
      ) : VERTICAL ? (
        <VerticalVariant track={track} tag={cfg.tag} line={cfg.line} highlight={cfg.highlight} withLine={variant !== 'hero'} />
      ) : variant === 'line' ? (
        <LineVariant track={track} tag={cfg.tag} line={cfg.line} highlight={cfg.highlight} />
      ) : variant === 'macro' ? (
        <MacroVariant track={track} tag={cfg.tag} />
      ) : (
        <HeroVariant track={track} tag={cfg.tag} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)' }} />
      <Grain t={t} />
    </div>
  )
}
