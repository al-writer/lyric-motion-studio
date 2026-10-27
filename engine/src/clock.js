import { useEffect, useState } from 'react'
import { RENDER } from './params.js'

// In render mode time comes from window.__T, set by the renderer before each
// frame (rAF and performance.now are faked too, so Framer Motion follows).
// In play mode it follows the <audio> element.
export function useClock(audioRef) {
  const [t, setT] = useState(0)
  useEffect(() => {
    let id
    const tick = () => {
      setT(RENDER ? window.__T ?? 0 : audioRef.current?.currentTime ?? 0)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [audioRef])
  return t
}

// Deterministic pseudo-random so every render looks the same.
export function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}
