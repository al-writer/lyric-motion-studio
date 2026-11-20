import { describe, expect, it } from 'vitest'
import { clipsAt, kenBurns, mediaKind, resolveClips, sourceTime } from '../engine/src/lib/timeline.js'

const lines = [{ section: 'verse', t: 10, e: 12, words: [] }, { section: 'chorus', t: 30, e: 32, words: [] }]
const media = { a: { src: 'r2://x/a.mp4' }, b: { src: 'b.mov' }, p: { src: 'assets/p.jpg' } }

describe('resolveClips', () => {
  const bg = { clips: [{ media: 'b', at: 'chorus', in: 2 }, { media: 'a', at: 0 }, { media: 'p', at: 'chorus+10' }], transition: { type: 'crossfade', dur: 1 } }
  const c = resolveClips(bg, { lines, duration: 60, media })
  it('orders clips by start and resolves time references', () => {
    expect(c.map((x) => [x.media, x.start])).toEqual([['a', 0], ['b', 30], ['p', 40]])
  })
  it('lets a clip run into the next one by the crossfade', () => {
    expect(c.map((x) => x.end)).toEqual([31, 41, 60])
  })
  it('detects images by extension', () => {
    expect(c.map((x) => x.kind)).toEqual(['video', 'video', 'image'])
    expect(mediaKind({ src: 'x.PNG' })).toBe('image')
  })
  it('crossfades the incoming clip over the outgoing one', () => {
    expect(clipsAt(c, 30.5).map((x) => [x.clip.media, x.opacity])).toEqual([['a', 1], ['b', 0.5]])
    expect(clipsAt(c, 31).map((x) => x.clip.media)).toEqual(['b'])
  })
  it('fades through black with fade-black', () => {
    const f = resolveClips({ ...bg, transition: { type: 'fade-black', dur: 2 } }, { lines, duration: 60, media })
    expect(f[0].end).toBe(30)
    expect(clipsAt(f, 29.5)[0].opacity).toBeCloseTo(0.5)
    expect(clipsAt(f, 30.5)[0].opacity).toBeCloseTo(0.5)
  })
  it('fails on unknown media', () => {
    expect(() => resolveClips({ clips: [{ media: 'zz' }] }, { media })).toThrow(/"zz"/)
  })
})

describe('sourceTime', () => {
  const clip = { start: 10, in: 2, speed: 0.5, loop: false }
  it('maps stage time to source time with in-point and speed', () => {
    expect(sourceTime(clip, 14)).toBe(4)
  })
  it('freezes on the last frame, or wraps when looping', () => {
    expect(sourceTime(clip, 100, 5, 25)).toBeCloseTo(4.96)
    expect(sourceTime({ ...clip, loop: true }, 18, 5)).toBe(1)
  })
})

describe('kenBurns', () => {
  it('keeps the image covering the stage', () => {
    const { s, tx, ty } = kenBurns({ from: { scale: 1, x: 0 }, to: { scale: 1.2, x: 1, y: 1 } }, 1, 1920, 1080, 1920, 1080)
    expect(s).toBeCloseTo(1.2)
    expect(tx).toBeCloseTo(1920 - 1920 * 1.2)
    expect(ty).toBeCloseTo(1080 - 1080 * 1.2)
  })
  it('centres the focus point when it can', () => {
    const { tx } = kenBurns({ from: { scale: 2, x: 0.5 }, to: { scale: 2, x: 0.5 } }, 0, 1000, 500, 1000, 500)
    expect(tx).toBeCloseTo(500 - 1000)
  })
})

import { sourceFrame } from '../engine/src/lib/timeline.js'
describe('sourceFrame', () => {
  const meta = { fps: 25, frames: 1000 }
  const clip = { start: 0, in: 0, speed: 1, loop: false }
  it('shows the frame on screen at that time, the same however it is reached', () => {
    expect(sourceFrame(clip, 370 / 30, meta)).toBe(308)
    expect(sourceFrame(clip, 1 / 25, meta)).toBe(1)
    expect(sourceFrame(clip, 0.039, meta)).toBe(0)
  })
  it('holds the last frame, or wraps when looping', () => {
    expect(sourceFrame(clip, 100, meta)).toBe(999)
    expect(sourceFrame({ ...clip, loop: true }, 40.04, meta)).toBe(1)
  })
  it('applies in-point, start and speed', () => {
    expect(sourceFrame({ start: 10, in: 2, speed: 2, loop: false }, 11, meta)).toBe(100)
  })
})
