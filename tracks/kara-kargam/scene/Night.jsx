// Track backdrop: a January night over Karaganda, full stage, behind the hero.
//   stars and a frosty moon; the aurora rises over the vocalise (bridge)
//   a skyline of panel blocks, a mine headframe and snowy spoil tips (terrikons),
//     windows switch on and off now and then
//   three layers of snow; it falls faster when the music gets louder
//   frost creeping in from the corners ("аяз қатты")
// Pure function of t: snow positions use the integral of the energy curve.

import { rng } from '../../../engine/src/clock.js'

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (v) => {
  const x = clamp(v)
  return x * x * (3 - 2 * x)
}

// cumulative energy, so snow speed can follow loudness without jumps
const CUM = new WeakMap()
function windAt(track, t) {
  let c = CUM.get(track)
  if (!c) {
    const fps = 30
    const n = Math.ceil(track.duration * fps) + 2
    c = new Float32Array(n)
    for (let i = 1; i < n; i++) c[i] = c[i - 1] + track.features(i / fps).energy / fps
    CUM.set(track, c)
  }
  const x = clamp(t * 30, 0, c.length - 1)
  const i = Math.floor(x)
  return c[i] + (c[Math.min(c.length - 1, i + 1)] - c[i]) * (x - i)
}

const STARS = (() => {
  const r = rng(7)
  return Array.from({ length: 90 }, () => ({ x: r(), y: r() * 0.55, s: 0.8 + r() * 1.8, p: r() * 6.28, f: 0.6 + r() * 1.6 }))
})()

const FLAKES = (() => {
  const r = rng(2024)
  // depth 0 far (small, slow, dim) .. 2 near (big, fast, soft)
  return Array.from({ length: 150 }, (_, i) => {
    const d = i < 80 ? 0 : i < 130 ? 1 : 2
    return { x: r(), y: r(), d, size: [2.2, 4, 9][d] * (0.7 + r() * 0.6), speed: [26, 48, 90][d] * (0.8 + r() * 0.4), sway: 8 + r() * 30, p: r() * 6.28, a: [0.45, 0.7, 0.55][d] }
  })
})()

// skyline: panel blocks with a fixed window grid
const BLOCKS = (() => {
  const r = rng(91)
  const out = []
  let x = -20
  while (x < 1940) {
    const w = 90 + r() * 120
    const floors = r() < 0.3 ? 9 : 5
    out.push({ x, w, h: floors * 19 + 14, floors, cols: Math.floor(w / 18), seed: Math.floor(r() * 1e6) })
    x += w + 8 + r() * 40
  }
  return out
})()

// 9:16: the bottom ~400 px sit under the Shorts / Reels / TikTok caption, so
// the city stands just under the spectrum line instead, larger, shifted to keep the
// headframe clear of the action buttons on the right.
function Skyline({ t, W, H, vertical }) {
  const scale = vertical ? 0.85 : W / 1920
  const base = vertical ? H - 360 : H - 40 * scale
  const shift = vertical ? -200 : 0
  const ground = vertical ? 480 : 60
  const slot = Math.floor(t / 6) // windows change every 6 s
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="nt-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24305a" />
          <stop offset="1" stopColor="#10172f" />
        </linearGradient>
      </defs>
      <g transform={`translate(${shift} ${base}) scale(${scale})`}>
        {/* terrikons on the horizon */}
        <path d="M120 0 L330 -230 L380 -232 L600 0 Z" fill="url(#nt-cone)" opacity="0.9" />
        <path d="M300 -196 L330 -230 L380 -232 L414 -194 C380 -204 336 -206 300 -196 Z" fill="#cfdaf5" opacity="0.55" />
        <path d="M1240 0 L1420 -190 L1462 -192 L1660 0 Z" fill="url(#nt-cone)" opacity="0.8" />
        <path d="M1395 -162 L1420 -190 L1462 -192 L1490 -160 C1460 -170 1422 -170 1395 -162 Z" fill="#cfdaf5" opacity="0.5" />
        {/* mine headframe (копёр) with its wheels */}
        <g transform={`translate(${vertical ? 1100 : 1600} 0)`} stroke="#0c1124" strokeWidth="7" fill="none">
          <path d="M0 0 L40 -250 L80 0 M10 -60 L70 -60 M18 -120 L62 -120 M26 -180 L54 -180 M40 -250 L120 0" />
          <circle cx="40" cy="-262" r="22" strokeWidth="5" />
          <circle cx="40" cy="-262" r="3" fill="#0c1124" />
          <circle cx="40" cy="-262" r="1.5" fill="#ff5a4a" stroke="none" opacity={0.5 + 0.5 * Math.sin(t * 2.2)} />
        </g>
        {/* panel blocks */}
        {BLOCKS.map((b) => {
          const r = rng(b.seed + slot * 7919)
          return (
            <g key={b.x}>
              <rect x={b.x} y={-b.h} width={b.w} height={b.h + 40} fill="#0a0f22" />
              <rect x={b.x} y={-b.h - 4} width={b.w} height="5" fill="#d6e0f7" opacity="0.6" />
              {Array.from({ length: b.floors * b.cols }, (_, i) => {
                const lit = r() < 0.12
                if (!lit) return null
                const fx = i % b.cols
                const fy = Math.floor(i / b.cols)
                if (vertical && fy >= b.floors - 3) return null // keep the floors behind the spectrum dark
                return <rect key={i} x={b.x + 8 + fx * 18} y={-b.h + 10 + fy * 19} width="9" height="10" fill={r() < 0.75 ? '#ffc56a' : '#9cc2ff'} opacity={0.4 + 0.35 * r()} />
              })}
            </g>
          )
        })}
        {/* snow on the ground in front */}
        <path d={`M-20 -6 C400 -26 900 -2 1300 -18 C1600 -28 1800 -10 1940 -16 L1940 ${ground} L-20 ${ground} Z`} fill="#c4d2f0" opacity="0.85" />
      </g>
    </svg>
  )
}

function Aurora({ t, k, energy, W, H }) {
  if (k < 0.01) return null
  const bands = [
    { y: 0.16, c: '70,255,190', w: 1.0, p: 0 },
    { y: 0.24, c: '90,200,255', w: 0.8, p: 1.7 },
    { y: 0.12, c: '170,110,255', w: 0.7, p: 3.1 },
  ]
  return bands.map((b, i) => {
    const cx = 50 + Math.sin(t * 0.21 + b.p) * 22
    const cy = (b.y + Math.sin(t * 0.33 + b.p) * 0.03) * 100
    const a = k * (0.22 + 0.22 * energy) * b.w
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(${W * 0.55}px ${H * 0.09}px at ${cx}% ${cy}%, rgba(${b.c},${a.toFixed(3)}), transparent 70%),
            radial-gradient(${W * 0.35}px ${H * 0.16}px at ${cx + 18 * Math.sin(t * 0.17 + i)}% ${cy + 4}%, rgba(${b.c},${(a * 0.6).toFixed(3)}), transparent 70%)`,
          transform: `skewX(${Math.sin(t * 0.25 + b.p) * 14}deg)`,
          mixBlendMode: 'screen',
        }}
      />
    )
  })
}

export default function Night({ track, t }) {
  const W = track.vertical ? 1080 : 1920
  const H = track.vertical ? 1920 : 1080
  const f = track.features(t)
  const lines = track.lines
  const bridge = lines.filter((l) => l.section === 'bridge')
  const chorusEnd = lines.filter((l) => l.section === 'chorus').at(-1)?.e ?? track.duration
  const auroraK = bridge.length ? ease((t - chorusEnd) / 4) * (1 - ease((t - (bridge.at(-1).e + 4)) / 5)) : 0
  const wind = windAt(track, t)
  const gust = Math.sin(t * 0.23) * 0.5 + 0.5

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* stars */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x * W,
            top: s.y * H,
            width: s.s,
            height: s.s,
            borderRadius: '50%',
            background: '#e8efff',
            opacity: (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.f + s.p))) * (1 - 0.5 * auroraK) + 0.3 * f.high,
          }}
        />
      ))}
      {/* moon */}
      <div
        style={{
          position: 'absolute',
          left: W * (track.vertical ? 0.74 : 0.82) - 60,
          top: H * (track.vertical ? 0.08 : 0.12) - 60,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 38%, #fbfdff, #d7e2fb 60%, #b6c6ee)',
          boxShadow: `0 0 ${80 + 40 * f.energy}px rgba(200,220,255,0.45), 0 0 220px rgba(140,170,255,0.25)`,
          opacity: 0.92,
        }}
      >
        <div style={{ position: 'absolute', left: 30, top: 44, width: 22, height: 18, borderRadius: '50%', background: 'rgba(150,170,215,0.35)' }} />
        <div style={{ position: 'absolute', left: 66, top: 70, width: 14, height: 12, borderRadius: '50%', background: 'rgba(150,170,215,0.3)' }} />
      </div>
      <Aurora t={t} k={auroraK} energy={f.energy} W={W} H={H} />
      <Skyline t={t} W={W} H={H} vertical={track.vertical} />
      {/* snow */}
      {FLAKES.map((s, i) => {
        const fall = s.speed * (t * 0.55 + wind * 1.6)
        const span = H + 40
        const y = ((((s.y * span + fall) % span) + span) % span) - 20
        const drift = (wind * 22 + t * 4) * (s.d + 1) * (0.6 + 0.4 * gust)
        const x = ((((s.x * W + Math.sin(t * 0.6 + s.p) * s.sway + drift) % W) + W) % W)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              background: s.d === 2 ? 'radial-gradient(circle, rgba(240,246,255,0.9), rgba(240,246,255,0) 70%)' : '#eef4ff',
              opacity: s.a,
            }}
          />
        )
      })}
      {/* frost in the corners */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(${W * 0.32}px ${W * 0.26}px at 0% 0%, rgba(210,228,255,${(0.16 + 0.06 * gust).toFixed(3)}), transparent 70%),
            radial-gradient(${W * 0.3}px ${W * 0.24}px at 100% 0%, rgba(210,228,255,0.12), transparent 70%),
            radial-gradient(${W * 0.34}px ${W * 0.24}px at 0% 100%, rgba(210,228,255,0.14), transparent 70%),
            radial-gradient(${W * 0.3}px ${W * 0.22}px at 100% 100%, rgba(210,228,255,0.12), transparent 70%)`,
        }}
      />
    </div>
  )
}
