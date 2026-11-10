// Track hero: the "minted coin" sun of verse 1, a copper coin under a string
// of Edison bulbs. Verdigris creeps over it as the song goes (scene.hero.patina
// = [start, end] seconds), so by the outro the gold has turned to rust.
// Everything is a pure function of t. Drawn in a 600 x 600 viewBox.
const clamp = (v) => Math.max(0, Math.min(1, v))
const smooth = (v) => v * v * (3 - 2 * v)

const BULBS = Array.from({ length: 9 }, (_, i) => {
  const u = i / 8
  return { x: 30 + u * 540, y: 40 + 46 * Math.sin(Math.PI * u), phase: i * 1.7 }
})

const REEDS = Array.from({ length: 120 }, (_, i) => (i / 120) * Math.PI * 2)

export default function Coin({ scene, t }) {
  const [p0, p1] = scene.hero?.patina ?? [20, 270]
  const patina = smooth(clamp((t - p0) / (p1 - p0)))
  const shine = ((t * 0.08) % 1) * 1.6 - 0.3 // a glint sweeping across the face
  const cx = 300
  const cy = 345
  const R = 215
  return (
    <svg viewBox="0 0 600 600" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="cu" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffd2a0" />
          <stop offset="0.35" stopColor="#e6955a" />
          <stop offset="0.75" stopColor="#b35a2c" />
          <stop offset="1" stopColor="#6e3115" />
        </radialGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc890" />
          <stop offset="0.5" stopColor="#a4501f" />
          <stop offset="1" stopColor="#5a2610" />
        </linearGradient>
        <linearGradient id="glint" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset={Math.max(0, shine - 0.12)} stopColor="#fff" stopOpacity="0" />
          <stop offset={clamp(shine)} stopColor="#fff6e6" stopOpacity="0.45" />
          <stop offset={Math.min(1, shine + 0.12)} stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="verdigris" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="11" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values={`0 0 0 0 0.31  0 0 0 0 0.62  0 0 0 0 0.52  ${-6} 0 0 0 ${(1.3 + 2.2 * patina).toFixed(3)}`}
          />
        </filter>
        <filter id="grit">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.35 0" />
        </filter>
        <radialGradient id="bulb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff2c8" />
          <stop offset="0.4" stopColor="#ffc46a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff9a3a" stopOpacity="0" />
        </radialGradient>
        <clipPath id="face">
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
        <path id="ring" d={`M ${cx - 168} ${cy} a 168 168 0 1 1 336 0 a 168 168 0 1 1 -336 0`} />
      </defs>

      {/* string of Edison bulbs */}
      <path
        d={`M ${BULBS[0].x} ${BULBS[0].y} ${BULBS.slice(1).map((b) => `L ${b.x} ${b.y}`).join(' ')}`}
        fill="none"
        stroke="#2b1a10"
        strokeWidth="3"
      />
      {BULBS.map((b, i) => {
        const glow = 0.75 + 0.25 * Math.sin(t * 2.3 + b.phase) * Math.sin(t * 0.7 + i)
        return (
          <g key={i} transform={`translate(${b.x} ${b.y + 14})`}>
            <circle r={38} fill="url(#bulb)" opacity={0.55 * glow} />
            <rect x={-5} y={-16} width={10} height={9} rx={2} fill="#3a2a1c" />
            <ellipse rx={9} ry={12} cy={2} fill="#ffe2a8" opacity={0.6 + 0.4 * glow} />
            <path d="M -3 0 q 3 -6 6 0" stroke="#fff6dc" strokeWidth="1.4" fill="none" opacity={glow} />
          </g>
        )
      })}

      {/* coin edge (thickness) */}
      <ellipse cx={cx + 9} cy={cy + 12} rx={R} ry={R} fill="#4a1f0b" />
      <circle cx={cx} cy={cy} r={R} fill="url(#rim)" />
      {REEDS.map((a, i) => (
        <line
          key={i}
          x1={cx + Math.cos(a) * (R - 2)}
          y1={cy + Math.sin(a) * (R - 2)}
          x2={cx + Math.cos(a) * (R - 13)}
          y2={cy + Math.sin(a) * (R - 13)}
          stroke="#5a2610"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
      ))}
      <circle cx={cx} cy={cy} r={R - 18} fill="url(#cu)" />
      <circle cx={cx} cy={cy} r={R - 34} fill="none" stroke="#7a3818" strokeOpacity="0.5" strokeWidth="2.5" />

      {/* embossed scene: low sun over a terrace railing and skyline */}
      <g clipPath="url(#face)" fill="#8a3f19" fillOpacity="0.55">
        <circle cx={cx} cy={cy + 6} r={58} fill="#ffcf98" fillOpacity="0.55" />
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={i}
            x1={cx + Math.cos(Math.PI + (i * Math.PI) / 10) * 70}
            y1={cy + 6 + Math.sin(Math.PI + (i * Math.PI) / 10) * 70}
            x2={cx + Math.cos(Math.PI + (i * Math.PI) / 10) * 98}
            y2={cy + 6 + Math.sin(Math.PI + (i * Math.PI) / 10) * 98}
            stroke="#ffd2a0"
            strokeOpacity="0.5"
            strokeWidth="3"
          />
        ))}
        <path d={`M ${cx - 150} ${cy + 40} h 30 v -38 h 22 v 24 h 18 v -60 h 26 v 74 h 120 v -46 h 20 v -20 h 22 v 66 h 30 v 30 h -288 z`} />
        <rect x={cx - 150} y={cy + 68} width={300} height={7} rx={3} />
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} x={cx - 146 + i * 24} y={cy + 75} width={5} height={46} />
        ))}
        <rect x={cx - 150} y={cy + 120} width={300} height={9} rx={3} />
      </g>
      <text fontFamily="'Fraunces Variable', serif" fontSize="25" letterSpacing="7" fill="#6a2c10" fillOpacity="0.75">
        <textPath href="#ring" startOffset="2%">
          COPPER ON THE TERRACE · TONIGHT · MMXXVI ·
        </textPath>
      </text>

      {/* oxidation and wear */}
      <g clipPath="url(#face)">
        <rect x={cx - R} y={cy - R} width={2 * R} height={2 * R} filter="url(#grit)" />
        <rect x={cx - R} y={cy - R} width={2 * R} height={2 * R} filter="url(#verdigris)" />
        <rect x={cx - R} y={cy - R} width={2 * R} height={2 * R} fill="url(#glint)" opacity={1 - 0.7 * patina} />
      </g>
    </svg>
  )
}
