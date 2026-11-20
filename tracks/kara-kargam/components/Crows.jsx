// Track hero: a paper-cut winter diorama, 900 x 450. Two snowy spoil-tip
// hills (Karaganda's terrikons) on either side of a street lamp; the old
// crow sits alone on the left one. The story follows the lyrics:
//   "...бір қарға қонды"           a second crow flies in and lands opposite
//   "Жүрегінде ... от жанды"        an ember lights up in the old crow's chest
//   "...бір-біріне қарады"          the old crow lifts its head and looks over
//   "Қарт қарға қарқылдады!"        it caws (and on every "қарқылдап" after)
//   chorus                          beaks snap on the words
//   vocalise (bridge break)         the second crow flies across and joins him
// Every value is a pure function of t; cues come from the word timings.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (v) => {
  const x = clamp(v)
  return x * x * (3 - 2 * x)
}
const ramp = (t, a, b) => ease((t - a) / (b - a))
const mix = (a, b, k) => a + (b - a) * k

// Cue times, found once per track from the timed lyrics.
const CUES = new WeakMap()
function cues(track) {
  if (CUES.has(track)) return CUES.get(track)
  const lines = track.lines
  const find = (re) => lines.find((l) => re.test(l.words.map((w) => w.w).join(' ')))
  const word = (line, re, fallback) => line?.words.find((w) => re.test(w.w))?.t ?? fallback
  const land = find(/қонды/i)
  const spark = find(/от жанды/i)
  const look = find(/бір-біріне/i)
  const caw = find(/қарқылдады/i)
  const bridge = lines.filter((l) => l.section === 'bridge')
  const chorus = lines.filter((l) => l.section === 'chorus')
  const c = {
    first: lines[0]?.t ?? 5,
    last: lines.at(-1)?.e ?? track.duration,
    flyIn: land ? [land.t - 0.2, word(land, /қонды/i, land.e)] : [20, 22],
    spark: spark ? [spark.t, spark.e + 1] : [24, 26],
    look: look ? word(look, /қарады/i, look.e) : 28,
    caws: [
      ...(caw ? [word(caw, /қарқыл/i, caw.t)] : []),
      ...lines.flatMap((l) => l.words.filter((w) => /^қарқылдап/i.test(w.w)).map((w) => w.t)),
    ],
    chorusWords: chorus.flatMap((l) => l.words.map((w) => w.t)),
    chorus: chorus.length ? [chorus[0].t, chorus.at(-1).e] : [0, 0],
    // the second crow crosses over in the middle of the break between the two bridge lines
    join: bridge.length > 1 ? (() => {
      const mid = (bridge[0].e + bridge[1].t) / 2
      return [mid - 1.8, mid + 1.8]
    })() : [track.duration * 0.75, track.duration * 0.75 + 3.6],
    bridge: bridge.length ? [bridge[0].t - 14, bridge.at(-1).e] : [0, 0],
  }
  CUES.set(track, c)
  return c
}

// Beak opening 0..1 for a list of onsets: snaps open, closes in `len` s.
function snap(t, onsets, len = 0.22) {
  let v = 0
  for (const o of onsets) if (t >= o && t - o < len) v = Math.max(v, Math.sin(((t - o) / len) * Math.PI))
  return v
}

// Quadratic bezier between two points with a control point
const qb = (p0, c, p1, k) => [
  (1 - k) ** 2 * p0[0] + 2 * (1 - k) * k * c[0] + k * k * p1[0],
  (1 - k) ** 2 * p0[1] + 2 * (1 - k) * k * c[1] + k * k * p1[1],
]

// One crow in profile, facing right, feet at (0,0), about 95 px tall.
function Crow({ id, head = 0, beak = 0, flap = 0, flying = 0, hunch = 0, blink = 0, ember = 0, old = false, sheen = '#3b4c78', bass = 0 }) {
  const wing = flying ? -70 + 95 * (0.5 + 0.5 * Math.sin(flap)) : 0
  return (
    <g transform={flying ? 'rotate(14 0 -40)' : undefined}>
      {/* far wing, only seen in flight */}
      {flying ? (
        <g transform={`rotate(${wing * 0.8 - 10} -2 -56)`}>
          <path d="M-24 -48 C-12 -70 18 -72 30 -54 C18 -38 -2 -30 -46 -24 Z" fill="#05060b" opacity="0.85" />
        </g>
      ) : null}
      {/* tail */}
      <path d="M-30 -30 L-66 -6 L-60 2 L-46 -2 L-52 6 L-24 -16 Z" fill="#0b0d16" />
      {/* body, squashed a little while hunched */}
      <g transform={`translate(0 -8) scale(${1 + 0.06 * hunch} ${1 - 0.1 * hunch + 0.02 * bass}) translate(0 8)`}>
        <path d="M-36 -32 C-34 -68 6 -84 30 -64 C44 -52 40 -22 20 -10 C4 0 -22 -2 -36 -32 Z" fill="#10131f" />
        <path d="M-30 -40 C-14 -60 8 -66 22 -56" stroke={sheen} strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" />
        {/* chest ember */}
        {ember > 0.01 && (
          <g opacity={ember}>
            <circle cx="18" cy="-36" r={34 + 14 * bass} fill={`url(#${id}-ember)`} />
            <path d="M18 -26 c-9 -7 -13 -11 -13 -17 a6.5 6.5 0 0 1 13 -1.5 a6.5 6.5 0 0 1 13 1.5 c0 6 -4 10 -13 17 Z" fill="#ffd27a" />
          </g>
        )}
        {/* wing (rises and beats in flight) */}
        <g transform={`rotate(${wing} -6 -52)`}>
          <path d="M-28 -44 C-16 -66 14 -66 24 -50 C16 -34 -2 -26 -44 -18 L-36 -24 L-46 -22 L-34 -30 Z" fill="#07080e" />
          <path d="M-20 -46 C-8 -58 8 -58 16 -50" stroke={sheen} strokeWidth="2" fill="none" opacity="0.5" />
        </g>
      </g>
      {/* legs */}
      {!flying && (
        <g stroke="#2a2a33" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M-4 -10 L-6 0 M-6 0 L-14 2 M-6 0 L2 2" />
          <path d="M8 -12 L8 0 M8 0 L0 2 M8 0 L16 2" />
        </g>
      )}
      {/* head: tilts down while lonely, up when looking */}
      <g transform={`rotate(${head} 26 -62)`}>
        {old && <path d="M10 -64 C14 -50 34 -46 44 -54 L42 -44 C30 -38 14 -42 8 -52 Z" fill="#c8323a" />}
        <circle cx="30" cy="-72" r="18" fill="#10131f" />
        {/* snow cap */}
        <path d="M14 -80 C18 -94 40 -96 46 -82 C38 -86 22 -86 14 -80 Z" fill="#eef4ff" />
        {old && (
          <g stroke="#9aa3b8" strokeWidth="2" strokeLinecap="round">
            <path d="M28 -82 L40 -80" />
            <path d="M20 -66 L14 -60 M22 -62 L18 -56" opacity="0.7" />
          </g>
        )}
        {/* eye */}
        <ellipse cx="36" cy="-75" rx="3.4" ry={3.4 * (1 - 0.9 * blink)} fill="#f2f4ff" />
        <circle cx="37" cy="-75.5" r={1.6 * (1 - blink)} fill="#0a0b12" />
        {/* beak: upper fixed, lower drops open */}
        <path d="M44 -78 L72 -70 L44 -66 Z" fill="#3a3d4a" />
        <g transform={`rotate(${beak * 28} 45 -66)`}>
          <path d="M44 -67 L66 -64 L43 -60 Z" fill="#2c2e38" />
        </g>
      </g>
    </g>
  )
}

const LEFT = [232, 244] // old crow's perch
const RIGHT = [690, 266] // opposite hill
const BESIDE = [392, 336] // where the second crow ends up
const K = 1.45 // crow size in the diorama

export default function Crows({ cfg, t, track, poster = false }) {
  const { features } = track ?? {}
  const f = features ? features(t) : { bass: 0, energy: 0, high: 0 }
  const c = track ? cues(track) : null
  const accent = cfg.colors.accent

  // --- old crow
  const lookK = c ? ramp(t, c.look - 0.5, c.look + 0.3) : 1
  const sparkK = c ? ramp(t, c.spark[0], c.spark[1]) : 1
  const blinkPhase = (t * 0.31 + 0.2) % 1
  const blink = blinkPhase < 0.03 ? Math.sin((blinkPhase / 0.03) * Math.PI) : 0
  const cawOld = c ? Math.max(snap(t, c.caws, 0.6), snap(t, c.chorusWords, 0.2)) : 0
  const bridgeSing = c ? ramp(t, c.bridge[0], c.bridge[0] + 2) * (1 - ramp(t, c.bridge[1], c.bridge[1] + 2)) : 0
  const sing = bridgeSing * (0.35 + 0.3 * Math.sin(t * 2.1))
  const oldHead = mix(26, -6, lookK) + Math.sin(t * 0.7) * 3 - 6 * cawOld
  const hunch = 1 - lookK

  // --- second crow: off stage, flies in, sits, later flies across
  let p2 = null
  let flying2 = 0
  let face2 = -1
  if (!c) p2 = RIGHT
  else if (t >= c.flyIn[0]) {
    const [a, b] = c.flyIn
    const [ja, jb] = c.join
    if (t < b) {
      const k = ease((t - a) / (b - a))
      p2 = qb([1010, 40], [860, 60], RIGHT, k)
      p2 = [p2[0], p2[1] + Math.sin(t * 9) * 4 * (1 - k)]
      flying2 = 1 - ramp(t, b - 0.25, b)
    } else if (t < ja) p2 = RIGHT
    else if (t < jb) {
      const k = ease((t - ja) / (jb - ja))
      p2 = qb(RIGHT, [480, 70], BESIDE, k)
      flying2 = Math.min(ramp(t, ja, ja + 0.3), 1 - ramp(t, jb - 0.3, jb))
    } else p2 = BESIDE
  }
  const joined = c ? ramp(t, c.join[1] - 0.2, c.join[1] + 0.8) : 0
  const caw2 = c ? Math.max(snap(t, track.beats.filter(([b]) => b >= c.chorus[0] && b <= c.chorus[1]).map(([b]) => b), 0.25), 0) : 0
  const oldFace = 1 // always faces right, towards the other hill

  // frosty breath puffs from the old crow's beak, every ~3.7 s
  const puffK = (t % 3.7) / 1.6
  const puff = puffK < 1 ? puffK : null

  // lamp: soft flicker plus a lift with the music
  const flicker = 0.88 + 0.06 * Math.sin(t * 13.1) * Math.sin(t * 3.7) + 0.12 * f.energy
  const titleK = poster || !c ? 0 : Math.max(1 - ramp(t, c.first - 1.6, c.first - 0.6), ramp(t, c.last + 0.3, c.last + 1.5))

  return (
    <svg viewBox="0 0 900 450" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="kk-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f8ff" />
          <stop offset="1" stopColor="#b9c8ea" />
        </linearGradient>
        <linearGradient id="kk-snow2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe8fb" />
          <stop offset="1" stopColor="#8fa3d1" />
        </linearGradient>
        <linearGradient id="kk-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a6da3" />
          <stop offset="1" stopColor="#2b3866" />
        </linearGradient>
        <radialGradient id="kk-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd890" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffb54a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kk-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc25a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="kk-bulb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="0.35" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffb54a" stopOpacity="0" />
        </radialGradient>
        {['old', 'two'].map((k) => (
          <radialGradient key={k} id={`kk-${k}-ember`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe6a6" stopOpacity="0.95" />
            <stop offset="0.4" stopColor="#ff9a3a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff6a2a" stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {/* title card, only on the intro and the very end */}
      {titleK > 0.01 && (
        <g opacity={titleK} transform={`translate(450 ${92 - 10 * (1 - titleK)})`}>
          <text textAnchor="middle" fontFamily={`'${cfg.fonts.display}', sans-serif`} fontWeight="800" fontSize="78" fill={cfg.colors.text} letterSpacing="2">
            ҚАРА, ҚАРҒАМ!
          </text>
          <text y="44" textAnchor="middle" fontFamily={`'${cfg.fonts.body}', serif`} fontStyle="italic" fontSize="26" fill={accent} opacity="0.9">
            Қаңтар · Қарағанды
          </text>
        </g>
      )}

      {/* far terrikon between the hills */}
      <path d="M330 420 L420 214 L470 212 L560 420 Z" fill="url(#kk-far)" opacity="0.85" />
      <path d="M404 250 L420 214 L470 212 L484 246 C460 238 432 240 404 250 Z" fill="#dfe8fb" opacity="0.8" />

      {/* hills: a shadow layer, then the paper */}
      <path d="M-6 426 C50 330 150 252 214 244 L252 243 C320 248 392 330 460 426 Z" fill="#5e72a8" transform="translate(8 8)" opacity="0.6" />
      <path d="M-6 426 C50 330 150 252 214 244 L252 243 C320 248 392 330 460 426 Z" fill="url(#kk-snow)" />
      <path d="M440 426 C510 340 600 272 668 266 L712 266 C780 272 850 340 906 426 Z" fill="#5e72a8" transform="translate(8 8)" opacity="0.6" />
      <path d="M440 426 C510 340 600 272 668 266 L712 266 C780 272 850 340 906 426 Z" fill="url(#kk-snow2)" />
      {/* drift lines on the snow */}
      <g stroke="#9fb1dc" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round">
        <path d="M90 360 C140 330 190 326 230 332" />
        <path d="M280 352 C320 344 352 356 380 380" />
        <path d="M560 360 C600 330 650 318 700 322" />
        <path d="M760 340 C800 352 830 372 850 396" />
      </g>

      {/* lamp light on the snow */}
      <ellipse cx="474" cy="414" rx={150 * flicker} ry={26 * flicker} fill="url(#kk-pool)" opacity={0.9 * flicker} />
      <path d="M480 156 L400 414 L560 414 Z" fill="url(#kk-cone)" opacity={0.75 * flicker} />

      {/* ground */}
      <path d="M-14 412 C200 396 700 396 914 412 L914 446 C700 462 200 462 -14 446 Z" fill="#6f82b8" transform="translate(0 6)" opacity="0.55" />
      <path d="M-14 412 C200 396 700 396 914 412 L914 446 C700 462 200 462 -14 446 Z" fill="url(#kk-snow)" />

      {/* lamp post */}
      <g>
        <path d="M452 418 L452 150 C452 128 470 124 482 140" stroke="#1a1f33" strokeWidth="7" fill="none" strokeLinecap="round" />
        <rect x="444" y="408" width="16" height="12" rx="3" fill="#1a1f33" />
        <path d="M470 140 L494 140 L490 156 L474 156 Z" fill="#1a1f33" />
        <circle cx="482" cy="160" r={46 + 12 * f.energy} fill="url(#kk-bulb)" opacity={flicker} />
        <path d="M447 150 C452 142 458 142 462 146" stroke="#eef4ff" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>

      {/* old crow on its hill */}
      <g transform={`translate(${LEFT[0]} ${LEFT[1] - 8 * cawOld * 0.4}) scale(${oldFace * K} ${K})`}>
        <Crow id="kk-old" old head={oldHead - 10 * joined} beak={Math.max(cawOld, sing)} hunch={hunch} blink={blink} ember={sparkK * (0.75 + 0.25 * Math.sin(t * 2.4))} bass={f.bass} />
      </g>
      {puff !== null && (
        <circle
          cx={LEFT[0] + K * (76 + 30 * puff)}
          cy={LEFT[1] - K * (66 + 18 * puff - 10 * (1 - lookK))}
          r={4 + 12 * puff}
          fill="#eef4ff"
          opacity={0.35 * (1 - puff)}
        />
      )}

      {/* "ҚАР!" when it caws */}
      {c &&
        c.caws.map((o) => {
          const k = (t - o) / 1.1
          if (k < 0 || k > 1) return null
          return (
            <g key={o} transform={`translate(${LEFT[0] + K * (100 + 30 * k)} ${LEFT[1] - K * (110 + 40 * k)}) rotate(-8) scale(${0.7 + 0.5 * Math.min(1, k * 5)})`} opacity={1 - k ** 2}>
              <text textAnchor="middle" fontFamily={`'${cfg.fonts.display}', sans-serif`} fontWeight="900" fontSize="40" fill={accent} stroke="#10131f" strokeWidth="6" paintOrder="stroke">
                ҚАР!
              </text>
            </g>
          )
        })}

      {/* the second crow faces the old one */}
      {p2 && (
        <g transform={`translate(${p2[0]} ${p2[1] - 6 * caw2}) scale(${face2 * K} ${K})`}>
          <Crow
            id="kk-two"
            head={-4 + Math.sin(t * 0.9 + 1) * 3 - 8 * caw2 + 8 * joined}
            beak={Math.max(caw2 * 0.8, bridgeSing * (0.35 + 0.3 * Math.sin(t * 2.1 + 1.4)))}
            flying={flying2 > 0.02 ? 1 : 0}
            flap={t * 16}
            blink={((t * 0.27 + 0.6) % 1) < 0.03 ? 1 : 0}
            ember={joined * (0.75 + 0.25 * Math.sin(t * 2.4 + 1))}
            sheen="#5a6fa8"
            bass={f.bass}
          />
        </g>
      )}
    </svg>
  )
}
