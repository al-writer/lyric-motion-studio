import { describe, expect, it } from 'vitest'
import { actStart, direct, lyricState, resolveTime, tagLines } from '../engine/src/lib/lyrics.js'

const L = (section, t, e, text = 'la la') => ({ section, t, e, words: text.split(' ').map((w) => ({ w, t, e })) })
const lines = [L('verse', 10, 12), L('verse', 13, 15), L('chorus', 20, 22), L('chorus', 23, 25), L('bridge', 40, 42), L('chorus', 50, 52)]

describe('lyricState', () => {
  it('is in the intro with credits before the first line', () => {
    const s = lyricState(lines, 5)
    expect(s).toMatchObject({ last: -1, cur: -1, section: 'intro', credits: true })
  })
  it('makes a line current `lead` s early and holds it `hold` s at most', () => {
    expect(lyricState(lines, 9.6).cur).toBe(0)
    expect(lyricState(lines, 9.5).cur).toBe(-1)
    expect(lyricState(lines, 12.5).cur).toBe(0) // until next.t - lead = 12.55
    expect(lyricState(lines, 12.6).cur).toBe(1)
    expect(lyricState(lines, 17.3).cur).toBe(1) // e + hold = 17.4
    expect(lyricState(lines, 17.5).cur).toBe(-1)
  })
  it('is in the outro after the last line, with closing credits 2 s later', () => {
    expect(lyricState(lines, 55).section).toBe('outro')
    expect(lyricState(lines, 55).credits).toBe(true)
    expect(lyricState(lines, 54.3).credits).toBe(false)
  })
})

describe('direct', () => {
  const scene = {
    hero: { pose: { default: 'side', bySection: { chorus: 'chorus' }, breaks: { gap: 3, pose: 'center' } } },
    lyrics: { layout: 'wheel' },
    acts: [{ from: 'bridge', hero: 'center', lyrics: 'caption' }],
  }
  const at = (t) => direct(lines, t, lyricState(lines, t), scene)
  it('picks the pose by section, and the break pose in long gaps', () => {
    expect(at(11).pose).toBe('side')
    expect(at(21).pose).toBe('chorus')
    expect(at(30)).toMatchObject({ pose: 'center', inBreak: true })
  })
  it('switches to an act after the line before the act ends', () => {
    expect(actStart(lines, scene.acts[0])).toBeCloseTo(25.8)
    expect(at(25.7).lyrics).toBe('wheel')
    expect(at(41)).toMatchObject({ pose: 'center', lyrics: 'caption' })
  })
  it('ends an act at "until"', () => {
    const s = { ...scene, acts: [{ at: 30, until: 45, lyrics: 'none' }] }
    expect(direct(lines, 31, lyricState(lines, 31), s).lyrics).toBe('none')
    expect(direct(lines, 46, lyricState(lines, 46), s).lyrics).toBe('wheel')
  })
})

describe('resolveTime', () => {
  it('understands seconds, sections, runs, lines and offsets', () => {
    expect(resolveTime(lines, 12)).toBe(12)
    expect(resolveTime(lines, 'chorus')).toBe(20)
    expect(resolveTime(lines, 'chorus#2')).toBe(50)
    expect(resolveTime(lines, 'line:2')).toBe(13)
    expect(resolveTime(lines, 'bridge-1.5')).toBe(38.5)
    expect(resolveTime(lines, 'end', 90)).toBe(90)
    expect(() => resolveTime(lines, 'chorus#3')).toThrow(/not found/)
  })
})

describe('tagLines', () => {
  it('marks emphasis and pop lines by regex, case-insensitively', () => {
    const t = tagLines([L('verse', 1, 2, 'Orange ticket stub'), L('verse', 3, 4, 'hold me up')], { emphasis: ['^orange'], pop: ['^HOLD'] })
    expect(t.map((l) => [l.emphasis, l.pop])).toEqual([[true, false], [false, true]])
  })
})
