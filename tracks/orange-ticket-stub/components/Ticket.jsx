// Track hero: torn orange admission stub, drawn as SVG (600 x 300 viewBox)
// inside the engine's 900x450 hero box.
export default function Ticket({ title = "ORANGE TICKET STUB", sub = "ADMIT ONE" }) {
  const holes = Array.from({ length: 13 }, (_, i) => 22 + i * 21.3)
  return (
    <svg viewBox="0 0 600 300" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffa34d" />
          <stop offset="0.55" stopColor="#ff8a2a" />
          <stop offset="1" stopColor="#e86a1c" />
        </linearGradient>
        <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="g2">
            <feFuncA type="table" tableValues="0 0.18" />
          </feComponentTransfer>
          <feComposite in="g2" in2="SourceGraphic" operator="in" result="tex" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="tex" />
          </feMerge>
        </filter>
        <mask id="cut">
          <rect width="600" height="300" fill="#fff" />
          <circle cx="0" cy="150" r="26" fill="#000" />
          <circle cx="470" cy="0" r="16" fill="#000" />
          <circle cx="470" cy="300" r="16" fill="#000" />
          {/* torn right edge */}
          <path
            d="M600 0 L588 18 L597 40 L585 63 L596 88 L586 112 L598 136 L584 160 L595 185 L587 208 L599 232 L585 256 L594 280 L588 300 L600 300 Z"
            fill="#000"
          />
        </mask>
      </defs>
      <g mask="url(#cut)" filter="url(#rough)">
        <rect width="600" height="300" rx="14" fill="url(#paper)" />
        <rect x="18" y="18" width="434" height="264" rx="8" fill="none" stroke="#7a2c08" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="2 6" />
        {/* fold crease */}
        <path d="M250 0 L262 300" stroke="#fff" strokeOpacity="0.22" strokeWidth="3" />
        <path d="M253 0 L265 300" stroke="#6b2306" strokeOpacity="0.18" strokeWidth="2" />
      </g>
      {holes.map((y) => (
        <circle key={y} cx="470" cy={y + 8} r="4.2" fill="#2a1408" opacity="0.55" />
      ))}
      <g fontFamily="'Space Mono', monospace" fill="#4a1a04">
        <text x="48" y="72" fontSize="22" letterSpacing="6" opacity="0.8">{sub}</text>
        <text x="48" y="150" fontSize="44" fontWeight="700" letterSpacing="1">
          {title.split(' ').slice(0, 2).join(' ')}
        </text>
        <text x="48" y="200" fontSize="44" fontWeight="700" letterSpacing="1">
          {title.split(' ').slice(2).join(' ')}
        </text>
        <text x="48" y="252" fontSize="16" letterSpacing="3" opacity="0.7">ARCADE · GATE 9</text>
        <text x="535" y="150" fontSize="18" letterSpacing="4" opacity="0.75" textAnchor="middle" transform="rotate(90 535 150)">
          Nº 0016
        </text>
      </g>
      {/* name in blue ink, leaning hard */}
      <text x="318" y="252" fontFamily="'Caveat', cursive" fontWeight="600" fontSize="40" fill="#1d3fa6" opacity="0.85" transform="rotate(-8 318 252)">
        stay
      </text>
    </svg>
  )
}
