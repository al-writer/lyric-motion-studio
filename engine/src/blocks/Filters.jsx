import { useScene } from '../lib/scene.jsx'
import { rng } from '../lib/math.js'
import { Grain } from './Scenery.jsx'

// Picture filters. The constant ones (blur, brightness, contrast, saturate,
// hue, sepia, grade) are baked into video frames by tools/frames.mjs; in the
// preview they are approximated with CSS. Film and VHS move per frame and
// are drawn over the picture as pure functions of t.

const GRADES = {
  'teal-orange': 'saturate(1.12) hue-rotate(-6deg) contrast(1.04)',
  warm: 'sepia(0.18) saturate(1.08)',
  cool: 'hue-rotate(8deg) saturate(0.94)',
  mono: 'grayscale(1)',
  faded: 'contrast(0.86) brightness(1.04) saturate(0.85)',
}

/** CSS filter string for the constant filters (preview, photos) */
export function cssFilter(f = {}) {
  const out = []
  if (f.blur) out.push(`blur(${f.blur}px)`)
  if (f.brightness != null && f.brightness !== 1) out.push(`brightness(${f.brightness})`)
  if (f.contrast != null && f.contrast !== 1) out.push(`contrast(${f.contrast})`)
  if (f.saturate != null && f.saturate !== 1) out.push(`saturate(${f.saturate})`)
  if (f.hue) out.push(`hue-rotate(${f.hue}deg)`)
  if (f.sepia) out.push(`sepia(${f.sepia})`)
  if (f.grade && GRADES[f.grade]) out.push(GRADES[f.grade])
  return out.join(' ') || 'none'
}

/** Colour wash over the picture. */
export function Tint({ color }) {
  if (!color) return null
  return <div style={{ position: 'absolute', inset: 0, background: color, pointerEvents: 'none' }} />
}

const DUST = (() => {
  const r = rng(7)
  return Array.from({ length: 400 }, () => ({ x: r(), y: r(), s: 1 + r() * 3, l: r() < 0.25 ? 6 + r() * 30 : 0, a: r() * 6.28, on: r() }))
})()

/**
 * Film: grain, exposure flicker, dust and hairs, gate weave.
 *   { grain: 0..0.3, flicker: 0..0.15, dust: bool, weave: 0..2 (px) }
 */
export function Film({ grain = 0.1, flicker = 0.03, dust = false, weave = 0, children }) {
  const { t, W, H } = useScene()
  const fr = Math.floor(t * 24) // film runs at 24 fps whatever the render rate
  const r = rng(fr + 11)
  const exposure = 1 + flicker * (r() * 2 - 1)
  const wx = weave * (r() * 2 - 1)
  const wy = weave * (r() * 2 - 1)
  const specks = dust ? DUST.filter((_, i) => (i * 7919 + fr * 104729) % 97 < 3) : []
  return (
    <>
      {children && <div style={{ position: 'absolute', inset: 0, transform: weave ? `translate(${wx}px, ${wy}px)` : undefined }}>{children}</div>}
      {flicker > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: exposure > 1 ? '#fff' : '#000', opacity: Math.abs(exposure - 1), mixBlendMode: exposure > 1 ? 'soft-light' : 'multiply', pointerEvents: 'none' }} />
      )}
      {specks.length > 0 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {specks.map((d, i) =>
            d.l ? (
              <path key={i} d={`M${d.x * W} ${d.y * H} q ${d.l / 2} ${d.l / 3} ${d.l * Math.cos(d.a)} ${d.l * Math.sin(d.a)}`} stroke="rgba(20,16,12,0.55)" strokeWidth="1.2" fill="none" />
            ) : (
              <circle key={i} cx={d.x * W} cy={d.y * H} r={d.s} fill={d.on > 0.5 ? 'rgba(255,250,240,0.7)' : 'rgba(15,12,10,0.6)'} />
            )
          )}
        </svg>
      )}
      <Grain opacity={grain} rate={24} />
    </>
  )
}

/**
 * VHS: scanlines, chroma bleed (red/cyan ghost of the frame), tracking jitter,
 * noise bands.  { scanlines: 0..1, chroma: px, jitter: px, noise: 0..1 }
 * Children are the picture the effect applies to.
 */
export function VHS({ scanlines = 0.35, chroma = 3, jitter = 2, noise = 0.25, children }) {
  const { t, W, H } = useScene()
  const fr = Math.floor(t * 30)
  const r = rng(fr + 3)
  const jx = jitter * (r() * 2 - 1) * (r() < 0.15 ? 3 : 1)
  const band = r() < noise ? { y: r() * H, h: 6 + r() * 40 } : null
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${jx}px)` }}>
        {children}
        {chroma > 0 && children && (
          <>
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${chroma}px)`, mixBlendMode: 'screen', opacity: 0.35, filter: 'url(#lms-red)' }}>{children}</div>
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-chroma}px)`, mixBlendMode: 'screen', opacity: 0.35, filter: 'url(#lms-cyan)' }}>{children}</div>
          </>
        )}
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="lms-red">
          <feColorMatrix values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="lms-cyan">
          <feColorMatrix values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      {scanlines > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)',
            opacity: scanlines,
            pointerEvents: 'none',
          }}
        />
      )}
      {band && <div style={{ position: 'absolute', left: 0, right: 0, top: band.y, height: band.h, background: 'rgba(255,255,255,0.12)', mixBlendMode: 'screen', backdropFilter: 'blur(1px)' }} />}
      <Grain opacity={0.12 * noise + 0.04} rate={30} />
    </>
  )
}
