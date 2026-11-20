import { useScene } from '../lib/scene.jsx'
import { clamp, ease } from '../lib/math.js'
import { Words, lineStyle } from './Words.jsx'

// Lyric lines as pure functions of t: every line has a window
// [t - lead, until) from lyricState's rules, comes in with an "enter" style
// and leaves with an "exit" style. No mounted state, so any frame (a chunk
// start, a thumbnail) looks the same however it was reached.

/** [from, until) of each line: current from t - lead until the next one or e + hold */
export function lineWindows(lines, { lead = 0.45, hold = 2.4 } = {}) {
  return lines.map((l, i) => {
    const next = lines[i + 1]
    return [l.t - lead, Math.min(next ? next.t - lead : Infinity, l.e + hold)]
  })
}

const ENTER = {
  fade: (p) => ({ opacity: ease.out(p) }),
  'rise-blur': (p) => {
    const k = ease.settle(p)
    return { opacity: k, transform: `translateY(${(1 - k) * 60}px)`, filter: `blur(${((1 - k) * 14).toFixed(2)}px)` }
  },
  'words-pop': () => ({}), // per word, below
  typewriter: () => ({}),
}
const EXIT = {
  none: () => ({}),
  fade: (q) => ({ opacity: 1 - ease.inOut(q) }),
  'fade-up': (q) => {
    const k = ease.settle(q)
    return { opacity: 1 - k, transform: `translateY(${-k * 60}px)` }
  },
  blur: (q) => {
    const k = ease.inOut(q)
    return { opacity: 1 - k, filter: `blur(${(k * 12).toFixed(2)}px)` }
  },
}

const merge = (a, b) => ({
  ...a,
  ...b,
  opacity: (a.opacity ?? 1) * (b.opacity ?? 1),
  transform: [a.transform, b.transform].filter(Boolean).join(' ') || undefined,
  filter: [a.filter, b.filter].filter(Boolean).join(' ') || undefined,
})

/** words-pop / typewriter: each word appears as it is sung */
function TimedWords({ line, style }) {
  const { t } = useScene()
  return line.words.map((w, i) => {
    const p = clamp((t - (w.t - 0.06)) / 0.32)
    const s = style === 'typewriter' ? { opacity: p > 0 ? 1 : 0 } : { opacity: ease.out(p), transform: `scale(${0.6 + 0.4 * ease.backOut(p)})` }
    return (
      <span key={i}>
        {i > 0 && ' '}
        <span style={{ display: 'inline-block', ...s }}>{w.w}</span>
      </span>
    )
  })
}

/**
 * The current lyric line (and optionally the previous one, dimmed) in a box.
 *   box, size, titleSize, align, enter, exit, enterDur, exitDur, previous, shadow, uppercase
 */
export default function Lyric({ box, size = 86, titleSize = 96, align = 'center', enter = 'rise-blur', exit = 'fade-up', enterDur = 0.6, exitDur = 0.45, previous = 'none', shadow, uppercase = false }) {
  const { t, track, cfg } = useScene()
  const lines = track.lines
  const win = lineWindows(lines, cfg.lyrics)
  const shown = []
  lines.forEach((l, i) => {
    const [a, b] = win[i]
    if (t >= a && t < b + exitDur) shown.push(i)
  })
  return (
    <div style={{ position: 'absolute', ...box, color: cfg.colors.text }}>
      {shown.map((i) => {
        const line = lines[i]
        const [a, b] = win[i]
        const p = clamp((t - a) / enterDur)
        const q = clamp((t - b) / exitDur)
        const current = t < b
        const st = merge((ENTER[enter] ?? ENTER.fade)(p), q > 0 ? (EXIT[exit] ?? EXIT.fade)(q) : {})
        // wiped words are transparent text over a gradient: a text-shadow would show through
        const wipe = cfg.lyrics.highlight === 'wipe' && enter !== 'words-pop' && enter !== 'typewriter'
        if (wipe && shadow) st.filter = [st.filter, 'drop-shadow(0 3px 14px rgba(0,0,0,0.7))'].filter(Boolean).join(' ')
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              translate: '0 -50%',
              lineHeight: 1.12,
              textAlign: align,
              textWrap: 'balance',
              textShadow: wipe ? 'none' : shadow,
              textTransform: uppercase ? 'uppercase' : undefined,
              ...lineStyle(cfg, line, { size, titleSize }),
              ...st,
            }}
          >
            {enter === 'words-pop' || enter === 'typewriter' ? <TimedWords line={line} style={enter} /> : <Words line={line} current={current} />}
          </div>
        )
      })}
      {previous === 'dim' &&
        shown.length === 1 &&
        shown[0] > 0 &&
        t < win[shown[0]][1] && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `calc(50% + ${size * 0.9}px)`,
              textAlign: align,
              opacity: 0.35,
              textShadow: shadow,
              ...lineStyle(cfg, lines[shown[0] - 1], { size: size * 0.6, titleSize: titleSize * 0.6 }),
            }}
          >
            {lines[shown[0] - 1].words.map((w) => w.w).join(' ')}
          </div>
        )}
    </div>
  )
}

/** Title and artist at the start (before the first line) and after the last one. */
export function TitleCard({ size = 120, artistSize = 34, box }) {
  const { t, track, cfg, lyric } = useScene()
  const lines = track.lines
  const first = lines[0]?.t ?? Infinity
  const last = lines.at(-1)?.e ?? 0
  const lead = cfg.lyrics.creditsLead
  // intro: in at 0.6 s, out by first - lead; outro: in 2 s after the last line
  const intro = clamp((t - 0.6) / 1.2) * (1 - clamp((t - (first - lead - 1)) / 1))
  const outro = clamp((t - (last + 2)) / 1.5)
  const k = lyric.ended ? outro : intro
  if (k <= 0) return null
  return (
    <div
      style={{
        position: 'absolute',
        ...(box ?? { left: 120, right: 120, top: 0, bottom: 0 }),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        opacity: k,
        transform: `translateY(${(1 - k) * 24}px)`,
        color: cfg.colors.text,
        textShadow: '0 4px 30px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontFamily: `'${cfg.fonts.body}', serif`, fontWeight: 600, fontSize: size, lineHeight: 1.02, letterSpacing: '-0.02em', textWrap: 'balance' }}>{cfg.title}</div>
      {cfg.artist && (
        <div style={{ marginTop: size * 0.3, fontFamily: `'${cfg.fonts.display}', monospace`, fontSize: artistSize, letterSpacing: '0.45em', textTransform: 'uppercase', color: cfg.colors.accentSoft }}>
          {cfg.artist}
        </div>
      )}
    </div>
  )
}
