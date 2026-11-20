// Small pure helpers for animations that are functions of time.
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, k) => a + (b - a) * k
export const mix = lerp
export const smooth = (v) => {
  const x = clamp(v)
  return x * x * (3 - 2 * x)
}
/** 0 before a, 1 after b, smooth in between */
export const ramp = (t, a, b) => smooth((t - a) / (b - a))
export const ease = {
  linear: (x) => clamp(x),
  in: (x) => clamp(x) ** 3,
  out: (x) => 1 - (1 - clamp(x)) ** 3,
  inOut: smooth,
  expoOut: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x))),
  // cubic-bezier(0.22, 1, 0.36, 1), the engine's usual "settle" curve
  settle: (x) => bezier(0.22, 1, 0.36, 1)(clamp(x)),
  backOut: (x) => {
    const p = clamp(x) - 1
    return 1 + 2.70158 * p ** 3 + 1.70158 * p ** 2
  },
}

/** CSS-style cubic-bezier easing */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  return (x) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const d = sx(t) - x
      const dx = (3 * ax * t + 2 * bx) * t + cx
      if (Math.abs(d) < 1e-6 || !dx) break
      t -= d / dx
    }
    return sy(clamp(t))
  }
}

/** Deterministic pseudo-random generator: every render looks the same. */
export function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** rgba() of an "r,g,b" colour string */
export const rgba = (rgb, a) => `rgba(${rgb},${typeof a === 'number' ? a.toFixed(3) : a})`
