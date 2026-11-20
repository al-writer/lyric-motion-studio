// Per-frame audio features written by tools/prepare (build/audio.json), as
// 0..1 lookups, plus helpers built on them. All pure functions of t.
const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

export function makeAudio(data) {
  const spectrum = decode(data.spectrum)
  const energy = decode(data.energy)
  const bass = decode(data.bass)
  const high = decode(data.high)
  const frame = (t) => Math.max(0, Math.min(data.frames - 1, Math.round(t * data.fps)))
  const features = (t) => {
    const f = frame(t)
    return {
      energy: energy[f] / 255,
      bass: bass[f] / 255,
      high: high[f] / 255,
      band: (i) => spectrum[f * data.bands + i] / 255,
    }
  }
  const cums = {}
  return {
    duration: data.duration,
    fps: data.fps,
    bands: data.bands,
    beats: data.beats, // [[t, strength], …] kicks
    features,
    /** integral of a feature over time (smooth "distance travelled" that follows loudness) */
    cumulative(name = 'energy', t) {
      let c = cums[name]
      if (!c) {
        const fps = 30
        const n = Math.ceil(data.duration * fps) + 2
        c = cums[name] = new Float32Array(n)
        for (let i = 1; i < n; i++) c[i] = c[i - 1] + features(i / fps)[name] / fps
      }
      const x = Math.max(0, Math.min(t * 30, c.length - 1))
      const i = Math.floor(x)
      return c[i] + (c[Math.min(c.length - 1, i + 1)] - c[i]) * (x - i)
    },
    /** 1 on a kick, decaying to 0 over `decay` s; `within` limits it to [from, to] */
    beatPulse(t, { decay = 0.35, within = null } = {}) {
      let v = 0
      for (const [b, s] of data.beats) {
        if (b > t) break
        if (within && (b < within[0] || b > within[1])) continue
        if (t - b < decay) v = Math.max(v, s * (1 - (t - b) / decay) ** 2)
      }
      return v
    },
  }
}
