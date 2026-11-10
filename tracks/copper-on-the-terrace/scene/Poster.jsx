import { motion } from 'framer-motion'
import { rng } from '../../../engine/src/clock.js'

// "Rooftop Disco '77": the whole frame as a 1970s record-sleeve poster.
// Cream paper, a striped retro sun sinking behind the terrace railing over the
// length of the song, and kinetic typography: each line is set as a justified
// stack of rows (heavy condensed caps, small words in italic serif) whose words
// slam in exactly when they are sung. Choruses flip the sleeve to terracotta
// with a spinning sunburst, the bridge goes frost-blue, the outro goes dark.
// Everything below is a function of t (backgrounds cross-fade through Framer
// Motion on rAF and settle in 1.2 s).

export const SKINS = {
  intro: { bg: '#efe3cc', ink: '#2b1a12', accent: '#c4572a', shadow: 'rgba(196,87,42,0.32)', sun: 1 },
  verse: { bg: '#efe3cc', ink: '#2b1a12', accent: '#c4572a', shadow: 'rgba(196,87,42,0.32)', sun: 1 },
  pre: { bg: '#e2d2b6', ink: '#3a2418', accent: '#9a3d1f', shadow: 'rgba(58,36,24,0.22)', sun: 0.75 },
  chorus: { bg: '#c4572a', ink: '#fbf0dc', accent: '#2b1a12', shadow: 'rgba(43,26,18,0.38)', sun: 1, adlib: '#2b1a12' },
  bridge: { bg: '#c7d3d8', ink: '#1d2a3a', accent: '#b4532a', shadow: 'rgba(29,42,58,0.25)', sun: 0.35 },
  outro: { bg: '#1c120d', ink: '#efe3cc', accent: '#6fb39c', shadow: 'rgba(0,0,0,0.5)', sun: 0.6 },
}

const SMALL = new Set(
  'a an the of to on in and at my your me you is it as if so not into like our was we i by for with just from when now but before while where there’s it’s you’re'.split(' ')
)
const HOT = /^(copper|gold|rust|velvet|dust|souvenir|frost|july|tonight|fever|cabernet|edge|terrace)$/i

const bare = (w) => w.toLowerCase().replace(/[^a-z’']/g, '').replace(/'/g, '’')
const isSmall = (w) => SMALL.has(bare(w))
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const backOut = (p) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2

// ---- text measuring (canvas, real font metrics once fonts are loaded) ----
let ctx
function measure(text, font) {
  ctx ??= document.createElement('canvas').getContext('2d')
  ctx.font = font
  return ctx.measureText(text).width
}

const SMALL_K = 0.5 // small words are set at this fraction of their row's size

// Greedy rows: small words lean on the next big word; a row closes after
// ~9 big letters or 3 words, so long words stand alone and get big.
function toRows(words) {
  const rows = []
  let row = []
  let big = 0
  words.forEach((w, i) => {
    row.push(i)
    if (!isSmall(w.w)) big += bare(w.w).length
    const nextBig = words[i + 1] && !isSmall(words[i + 1].w) ? bare(words[i + 1].w).length : 0
    if (big > 0 && (big + nextBig > 10 || row.length >= 3)) {
      rows.push(row)
      row = []
      big = 0
    }
  })
  if (row.length) {
    // a trailing row of only small words joins the previous one
    if (rows.length && row.every((i) => isSmall(words[i].w))) rows[rows.length - 1].push(...row)
    else rows.push(row)
  }
  return rows
}

function layout(words, fonts, box) {
  const bigFont = `400 100px '${fonts.display}'`
  const smallFont = `italic 500 100px '${fonts.body}'`
  const rows = toRows(words).map((idx) => {
    const parts = idx.map((i) => {
      const small = isSmall(words[i].w)
      const text = small ? words[i].w.toLowerCase() : words[i].w.toUpperCase()
      const w = small ? measure(text, smallFont) * SMALL_K : measure(text, bigFont)
      return { i, small, text, w }
    })
    const gap = 26
    const w100 = parts.reduce((s, p) => s + p.w, 0) + gap * (parts.length - 1)
    const size = Math.min(box.maxSize, (box.w / w100) * 100)
    return { parts, size, gap: (gap * size) / 100 }
  })
  const LH = 0.98
  const total = rows.reduce((s, r) => s + r.size * LH, 0)
  const k = Math.min(1, box.h / total)
  rows.forEach((r) => ((r.size *= k), (r.gap *= k)))
  return { rows, height: total * k, LH }
}

// ---- lyric stack ----
export function Stack({ words, t, enter, exitAt, skin, fonts, box, align }) {
  const { rows, height, LH } = layout(words, fonts, box)
  const q = clamp((t - exitAt) / 0.32)
  if (t < enter - 0.05 || q >= 1) return null
  const top = box.y + (box.h - height) / 2
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top,
        width: box.w,
        opacity: 1 - q,
        transform: `translateY(${-90 * q * q}px) skewY(${-4 * q}deg)`,
        filter: q > 0 ? `blur(${(6 * q).toFixed(2)}px)` : 'none',
      }}
    >
      {rows.map((r, ri) => (
        <div
          key={ri}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: align,
            gap: r.gap,
            height: r.size * LH,
            lineHeight: `${r.size * LH}px`,
            whiteSpace: 'nowrap',
          }}
        >
          {r.parts.map((p) => {
            const w = words[p.i]
            const e = clamp((t - (w.t - 0.05)) / 0.24)
            const s = backOut(e)
            const hot = HOT.test(bare(w.w))
            const singing = t >= w.t && t < w.e + 0.1
            return (
              <span
                key={p.i}
                style={{
                  display: 'inline-block',
                  fontFamily: p.small ? `'${fonts.body}', serif` : `'${fonts.display}', sans-serif`,
                  fontStyle: p.small ? 'italic' : 'normal',
                  fontWeight: p.small ? 500 : 400,
                  fontSize: p.small ? r.size * SMALL_K : r.size,
                  letterSpacing: p.small ? '0' : '0.005em',
                  color: hot ? skin.accent : skin.ink,
                  textShadow: p.small ? 'none' : `${(r.size * 0.035).toFixed(1)}px ${(r.size * 0.035).toFixed(1)}px 0 ${skin.shadow}`,
                  opacity: e,
                  transform: `translateY(${(1 - s) * r.size * 0.45}px) scale(${0.86 + 0.14 * s + (singing && !p.small ? 0.03 : 0)})`,
                  transformOrigin: '50% 80%',
                }}
              >
                {p.text}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ---- scenery ----
export function Sun({ cx, cy, r, t, glow }) {
  // classic 70s striped sun: slits get thicker towards the bottom
  const slits = Array.from({ length: 7 }, (_, i) => ({ y: 0.08 + i * 0.13, h: 0.018 + i * 0.012 }))
  return (
    <svg style={{ position: 'absolute', left: cx - r * 1.6, top: cy - r * 1.6, overflow: 'visible' }} width={r * 3.2} height={r * 3.2}>
      <defs>
        <linearGradient id="sunfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd36a" />
          <stop offset="0.45" stopColor="#f2913f" />
          <stop offset="0.8" stopColor="#c4572a" />
          <stop offset="1" stopColor="#8e3418" />
        </linearGradient>
        <radialGradient id="sunhalo">
          <stop offset="0.55" stopColor="#ffb860" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffb860" stopOpacity="0" />
        </radialGradient>
        <mask id="slits">
          <rect x="0" y="0" width={r * 3.2} height={r * 3.2} fill="#fff" />
          {slits.map((s, i) => (
            <rect key={i} x="0" y={r * 1.6 + s.y * r} width={r * 3.2} height={s.h * r} fill="#000" />
          ))}
        </mask>
      </defs>
      <circle cx={r * 1.6} cy={r * 1.6} r={r * 1.55} fill="url(#sunhalo)" opacity={glow} />
      <circle cx={r * 1.6} cy={r * 1.6} r={r} fill="url(#sunfill)" mask="url(#slits)" transform={`rotate(${Math.sin(t * 0.2) * 1.5} ${r * 1.6} ${r * 1.6})`} />
    </svg>
  )
}

export function Sunburst({ cx, cy, t, on, color }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        left: cx - 1600,
        top: cy - 1600,
        width: 3200,
        height: 3200,
        borderRadius: '50%',
        background: `repeating-conic-gradient(from 0deg, ${color} 0deg 6deg, transparent 6deg 15deg)`,
        transform: `rotate(${t * 9}deg)`,
        maskImage: 'radial-gradient(circle, #000 12%, transparent 62%)',
      }}
    />
  )
}

export function Railing({ W, H, vertical }) {
  const y = H - (vertical ? 300 : 170)
  const n = Math.ceil(W / 52) + 1
  const col = '#24150e'
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width: W, height: H - y }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18, background: col, borderRadius: 4 }} />
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{ position: 'absolute', left: i * 52 + 14, top: 18, width: 16, height: H - y - 60, background: col, borderRadius: '8px 8px 2px 2px' }}
        />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, background: col }} />
    </div>
  )
}

const SPARKS = (() => {
  const r = rng(77)
  return Array.from({ length: 16 }, () => ({ x: r(), y: r(), s: 18 + r() * 34, ph: r() * 6.28, sp: 1.2 + r() * 1.6 }))
})()

function Sparkles({ t, on, color, box }) {
  if (!on) return null
  return SPARKS.map((p, i) => {
    const k = Math.max(0, Math.sin(t * p.sp + p.ph)) ** 4
    return (
      <svg
        key={i}
        width={p.s}
        height={p.s}
        viewBox="-1 -1 2 2"
        style={{ position: 'absolute', left: box.x - 60 + p.x * (box.w + 120), top: box.y - 40 + p.y * (box.h + 80), transform: `scale(${k}) rotate(${t * 40}deg)`, opacity: k }}
      >
        <path d="M0 -1 Q0.12 -0.12 1 0 Q0.12 0.12 0 1 Q-0.12 0.12 -1 0 Q-0.12 -0.12 0 -1Z" fill={color} />
      </svg>
    )
  })
}

// ---- backing vocals: handwritten, scrawled on as they are sung ----
const WRITE = 0.9 // s to "write" an ad-lib on
function AdLibs({ lines, t, fonts, color, at, size }) {
  const shown = lines.flatMap((l) => l.adlibs ?? []).filter((a) => t >= a.t - 0.05 && t < a.e + 0.5)
  return shown.map((a, n) => {
    const w = clamp((t - a.t) / WRITE)
    const q = clamp((t - a.e) / 0.5)
    const ease = 1 - (1 - w) ** 2
    return (
      <div
        key={a.t}
        style={{
          position: 'absolute',
          left: at.x,
          top: at.y + n * size * 1.1,
          transform: `rotate(-7deg) translateY(${-30 * q}px)`,
          transformOrigin: '0 50%',
          opacity: 1 - q,
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            fontFamily: `'${fonts.hand}', cursive`,
            fontWeight: 600,
            fontSize: size,
            lineHeight: 1,
            color,
            clipPath: `inset(-20% ${((1 - ease) * 100).toFixed(2)}% -20% -5%)`,
          }}
        >
          {a.text}
        </div>
        {/* pen swoosh under it, drawn right after the words */}
        <svg width={size * 6} height={size * 0.4} viewBox="0 0 600 40" style={{ display: 'block', marginTop: -size * 0.05, overflow: 'visible' }}>
          <path
            d="M6 28 C 150 6, 330 6, 590 18"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - clamp((t - a.t - WRITE * 0.8) / 0.4)}
          />
        </svg>
      </div>
    )
  })
}

// ---- stage ----
export default function Poster({ track, t, section, W, H }) {
  const vertical = H > W
  const { scene, lines, duration } = track
  const skin = SKINS[section] ?? SKINS.verse
  const fonts = scene.fonts
  const box = vertical ? { x: 90, y: 250, w: 900, h: 1000, maxSize: 230 } : { x: 120, y: 120, w: 1020, h: 740, maxSize: 250 }
  const align = 'center'

  // the sun sinks behind the railing over the song
  const p = clamp(t / duration)
  const sun = vertical ? { cx: 540, cy: 1380 + 420 * p, r: 300 } : { cx: 1520, cy: 400 + 520 * p, r: 270 }
  const { bass } = track.features(t)
  const chorus = section === 'chorus'

  // lyric stacks: every line visible from its first word until the next one takes over
  const stacks = []
  lines.forEach((l, i) => {
    const next = lines[i + 1]
    const exitAt = Math.min(next ? next.t - 0.12 : Infinity, l.e + 2.6)
    if (t > l.t - 0.2 && t < exitAt + 0.35) stacks.push({ key: i, words: l.words, enter: l.t, exitAt })
  })
  // title card in the intro and after the last line
  const first = lines[0].t
  const last = lines.at(-1).e
  const title = (start) => ['Copper', 'on', 'the', 'Terrace'].map((w, i) => ({ w, t: start + i * 0.28, e: start + i * 0.28 + 0.3 }))
  if (t < first - 0.6) stacks.push({ key: 'title', words: title(1.6), enter: 1.6, exitAt: first - 1.2 })
  if (t > last + 3) stacks.push({ key: 'end', words: title(last + 3.4), enter: last + 3.4, exitAt: duration - 0.5 })

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <motion.div initial={false} animate={{ backgroundColor: skin.bg }} transition={{ duration: 1.2, ease: 'easeInOut' }} style={{ position: 'absolute', inset: 0 }} />
      <Sunburst cx={sun.cx} cy={sun.cy} t={t} on={chorus} color="rgba(255,214,150,0.22)" />
      <motion.div initial={false} animate={{ opacity: skin.sun }} transition={{ duration: 1.2 }} style={{ position: 'absolute', inset: 0 }}>
        <Sun cx={sun.cx} cy={sun.cy} r={sun.r * (1 + 0.025 * bass * bass)} t={t} glow={0.6 + 0.4 * bass} />
      </motion.div>
      <Railing W={W} H={H} vertical={vertical} />

      {/* sleeve furniture */}
      <div
        style={{
          position: 'absolute',
          left: vertical ? 90 : 120,
          right: vertical ? 90 : 120,
          top: vertical ? 120 : 52,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: "'Space Mono', monospace",
          fontSize: vertical ? 24 : 20,
          letterSpacing: '0.32em',
          color: skin.ink,
          opacity: 0.72,
          transition: 'none',
        }}
      >
        <span>{scene.artist.toUpperCase()}</span>
        <span>{(SECTION_LABEL[section] ?? '').toUpperCase()}</span>
      </div>

      <AdLibs
        lines={lines}
        t={t}
        fonts={fonts}
        color={skin.adlib ?? skin.ink}
        at={vertical ? { x: 140, y: box.y + box.h + 10 } : { x: 1235, y: 700 }}
        size={vertical ? 92 : 84}
      />
      <Sparkles t={t} on={chorus} color={skin.ink} box={box} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + (chorus ? 0.012 : 0.004) * bass * bass})`, transformOrigin: '40% 50%' }}>
        {stacks.map((s) => (
          <Stack key={s.key} {...s} t={t} skin={skin} fonts={fonts} box={box} align={align} />
        ))}
      </div>
    </div>
  )
}

const SECTION_LABEL = { intro: 'Side A · 03', verse: 'Verse', pre: 'Pre-chorus', chorus: 'Chorus', bridge: 'Bridge', outro: 'Outro' }
