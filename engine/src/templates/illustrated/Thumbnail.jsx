import { useScene, SceneProvider, slotProps } from '../../lib/scene.jsx'
import { rgba } from '../../lib/math.js'
import { HeroArt as Art, heroSize } from '../../blocks/Hero.jsx'
import Palette from '../../blocks/Palette.jsx'
import { Grain, Motes } from '../../blocks/Scenery.jsx'

// Covers in the illustrated look (1920x1080 YouTube thumbnails; 1080x1920
// Shorts covers with --format vertical). Variants for YouTube "Test & Compare":
//   hero  - the hero object large, glowing, with a small "lyric video" label
//   line  - one lyric line set big, the hero beside it
//   macro - a tight, cropped close-up of the hero with a label
//   promo - marketing cover: hook line, release badge, the hero, artist and title
// Text is kept away from the bottom-right corner, where YouTube draws the
// duration; vertical promo keeps everything inside the centre 3:4 (TikTok grids).
// project.json "thumbnails": { "tag", "line", "highlight", "t" },
//              "promo": { "hook", "highlight": [...], "badge" }

const glow = (cfg, a) => rgba(cfg.colors.glow, a)

/** the hero drawn at its own poster time */
function HeroArt({ w, h }) {
  const s = useScene()
  const hero = s.cfg.scene.hero
  return (
    <div style={{ width: w, height: h, filter: `drop-shadow(0 40px 60px rgba(0,0,0,0.6)) drop-shadow(0 0 120px ${glow(s.cfg, 0.55)})` }}>
      <SceneProvider track={s.track} t={hero.poster ?? 0} poster>
        <Art hero={hero} />
      </SceneProvider>
    </div>
  )
}

function Glow({ x, y, size = 1300, alpha = 0.6 }) {
  const { cfg } = useScene()
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size * 0.4,
        width: size,
        height: size * 0.8,
        background: `radial-gradient(closest-side, ${glow(cfg, alpha)}, transparent)`,
      }}
    />
  )
}

function Rings({ x, y }) {
  const { cfg } = useScene()
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
        border: `2px solid ${glow(cfg, 0.28 - i * 0.08)}`,
      }}
    />
  ))
}

function Tag({ children, style }) {
  const { cfg } = useScene()
  const { fonts, colors } = cfg
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

function Artist({ style }) {
  const { track, cfg } = useScene()
  const { fonts, colors, artist } = cfg
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

const heroBox = (track, cfg) => heroSize(track, cfg.scene.hero)

function HeroVariant({ tag }) {
  const { track, cfg } = useScene()
  const [w, h] = heroBox(track, cfg)
  const k = 1180 / w
  return (
    <>
      <Glow x={980} y={470} size={1600} alpha={0.65} />
      <Rings x={980} y={450} />
      <div style={{ position: 'absolute', left: 980 - w / 2, top: 450 - h / 2, transform: `scale(${k}) rotate(-7deg)` }}>
        <HeroArt w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 110, bottom: 96 }}>
        <Tag style={{ fontSize: 46 }}>{tag}</Tag>
        <Artist style={{ fontSize: 34, marginTop: 18 }} />
      </div>
    </>
  )
}

function LineVariant({ tag, line, highlight }) {
  const { track, cfg } = useScene()
  const { fonts, colors } = cfg
  const [w, h] = heroBox(track, cfg)
  const k = 760 / w
  const words = line.split(' ')
  return (
    <>
      <Glow x={1460} y={560} size={1200} alpha={0.55} />
      <div style={{ position: 'absolute', left: 1480 - w / 2, top: 560 - h / 2, transform: `scale(${k}) rotate(-12deg)` }}>
        <HeroArt w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 110, top: 150, width: 1040 }}>
        <Tag style={{ fontSize: 36, marginBottom: 34 }}>{tag}</Tag>
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
                <span style={{ color: colors.accentSoft, fontStyle: 'italic', textShadow: `0 0 50px ${glow(cfg, 0.9)}` }}>{wd}</span>
              ) : (
                wd
              )}
            </span>
          ))}
        </div>
        <Artist style={{ fontSize: 32, marginTop: 44 }} />
      </div>
    </>
  )
}

function MacroVariant({ tag }) {
  const { track, cfg } = useScene()
  const [w, h] = heroBox(track, cfg)
  const k = 2050 / w
  return (
    <>
      <Glow x={960} y={540} size={2000} alpha={0.5} />
      <div style={{ position: 'absolute', left: 1240 - w / 2, top: 560 - h / 2, transform: `scale(${k}) rotate(-6deg)` }}>
        <HeroArt w={w} h={h} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 80,
          padding: '18px 34px',
          borderRadius: 999,
          background: cfg.colors.text,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <Tag style={{ fontSize: 40, color: '#1a0c06', letterSpacing: '0.28em' }}>{tag}</Tag>
      </div>
    </>
  )
}

// 9:16 cover for Shorts. Everything sits in the upper two thirds: the Shorts
// player covers the bottom with the title and channel, the right edge with
// buttons. "line" sets the lyric line under the hero; "hero" stands the hero
// upright and large.
function VerticalVariant({ tag, line, highlight, withLine }) {
  const { track, cfg } = useScene()
  const { fonts, colors } = cfg
  const [w, h] = heroBox(track, cfg)
  const words = line.split(' ')
  if (!withLine)
    return (
      <>
        <Glow x={520} y={980} size={1500} alpha={0.6} />
        <Rings x={520} y={980} />
        <div style={{ position: 'absolute', left: 520 - w / 2, top: 980 - h / 2, transform: `scale(${1250 / w}) rotate(-78deg)` }}>
          <HeroArt w={w} h={h} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 60, top: 110, textAlign: 'center' }}>
          <Tag style={{ fontSize: 40 }}>{tag}</Tag>
          <Artist style={{ fontSize: 30, marginTop: 16 }} />
        </div>
      </>
    )
  return (
    <>
      <Glow x={520} y={560} size={1300} alpha={0.6} />
      <div style={{ position: 'absolute', left: 520 - w / 2, top: 520 - h / 2, transform: `scale(${930 / w}) rotate(-8deg)` }}>
        <HeroArt w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 60, right: 100, top: 880, textAlign: 'center' }}>
        <Tag style={{ fontSize: 34, marginBottom: 30 }}>{tag}</Tag>
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
                <span style={{ color: colors.accentSoft, fontStyle: 'italic', textShadow: `0 0 50px ${glow(cfg, 0.9)}` }}>{wd}</span>
              ) : (
                wd
              )}
            </span>
          ))}
        </div>
        <Artist style={{ fontSize: 30, marginTop: 40 }} />
      </div>
    </>
  )
}

function Hook({ text, highlight = [], size, align }) {
  const { cfg } = useScene()
  const { fonts, colors } = cfg
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
          {hl.has(wd.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')) ? (
            <span style={{ color: colors.accentSoft, fontStyle: 'italic', textShadow: `0 0 50px ${glow(cfg, 0.9)}` }}>{wd}</span>
          ) : (
            wd
          )}
        </span>
      ))}
    </div>
  )
}

function Badge({ children, size }) {
  const { cfg } = useScene()
  return (
    <div
      style={{
        display: 'inline-block',
        padding: `${size * 0.42}px ${size * 0.9}px`,
        borderRadius: 999,
        background: cfg.colors.accent,
        boxShadow: `0 10px 40px ${glow(cfg, 0.45)}`,
      }}
    >
      <Tag style={{ fontSize: size, color: '#1a0c06', letterSpacing: '0.24em' }}>
        {children}
      </Tag>
    </div>
  )
}

function Credit({ size }) {
  const { cfg } = useScene()
  const { fonts, colors, artist, title } = cfg
  return (
    <div style={{ fontFamily: `'${fonts.display}', monospace`, textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: size }}>
      <span style={{ color: colors.text }}>{artist}</span>
      <span style={{ color: colors.accent }}> — {title}</span>
    </div>
  )
}

function PromoVariant({ hook, highlight, badge }) {
  const { track, cfg, vertical } = useScene()
  const [w, h] = heroBox(track, cfg)
  if (vertical)
    return (
      <>
        <Glow x={520} y={1180} size={1300} alpha={0.6} />
        <Rings x={520} y={1180} />
        <div style={{ position: 'absolute', left: 0, right: 40, top: 330, textAlign: 'center' }}>
          <Badge size={30}>{badge}</Badge>
        </div>
        <div style={{ position: 'absolute', left: 70, right: 110, top: 470 }}>
          <Hook text={hook} highlight={highlight} size={118} align="center" />
        </div>
        <div style={{ position: 'absolute', left: 520 - w / 2, top: 1180 - h / 2, transform: `scale(${860 / w}) rotate(-9deg)` }}>
          <HeroArt w={w} h={h} />
        </div>
        <div style={{ position: 'absolute', left: 40, right: 80, top: 1540, textAlign: 'center' }}>
          <Credit size={26} />
        </div>
      </>
    )
  return (
    <>
      <Glow x={1440} y={560} size={1200} alpha={0.6} />
      <Rings x={1440} y={540} />
      <div style={{ position: 'absolute', left: 1440 - w / 2, top: 540 - h / 2, transform: `scale(${780 / w}) rotate(-10deg)` }}>
        <HeroArt w={w} h={h} />
      </div>
      <div style={{ position: 'absolute', left: 110, top: 150, width: 980 }}>
        <Badge size={30}>{badge}</Badge>
        <div style={{ marginTop: 50 }}>
          <Hook text={hook} highlight={highlight} size={128} align="left" />
        </div>
        <div style={{ marginTop: 56 }}>
          <Credit size={28} />
        </div>
      </div>
    </>
  )
}

export default function Thumbnail({ variant }) {
  const s = useScene()
  const { cfg, vertical } = s
  const th = { line: cfg.title, ...cfg.thumbnails }
  const promo = { hook: cfg.title, ...cfg.promo }
  const Backdrop = s.track.component(cfg.scene.backdrop?.component)
  return (
    <div style={{ position: 'relative', width: s.W, height: s.H, overflow: 'hidden', background: '#000' }}>
      <Palette section="chorus" />
      {Backdrop ? <Backdrop {...slotProps(s)} section="chorus" cur={-1} /> : <Motes />}
      {variant === 'promo' ? (
        <PromoVariant hook={promo.hook} highlight={promo.highlight} badge={promo.badge} />
      ) : vertical ? (
        <VerticalVariant tag={th.tag} line={th.line} highlight={th.highlight} withLine={variant !== 'hero'} />
      ) : variant === 'line' ? (
        <LineVariant tag={th.tag} line={th.line} highlight={th.highlight} />
      ) : variant === 'macro' ? (
        <MacroVariant tag={th.tag} />
      ) : (
        <HeroVariant tag={th.tag} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)' }} />
      <Grain />
    </div>
  )
}
