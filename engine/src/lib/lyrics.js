// Where the song is at time t, as plain data: pure functions, unit-tested.

export const lineText = (line) => line.words.map((w) => w.w).join(' ')

/**
 * Lyric state at time t.
 *   last      index of the last line that has begun (lead included), -1 before
 *   cur       the line being sung (or held), -1 between lines
 *   gapAhead  seconds until the next line
 *   ended     after the last line has been let go
 *   section   section of the last line ('intro' before, 'outro' after the end)
 *   credits   opening / closing credits are up
 */
export function lyricState(lines, t, { lead = 0.45, hold = 2.4, creditsLead = 1.5 } = {}) {
  let last = -1
  for (let i = 0; i < lines.length; i++) if (lines[i].t - lead <= t) last = i
  let cur = -1
  if (last >= 0) {
    const next = lines[last + 1]
    const until = Math.min(next ? next.t - lead : Infinity, lines[last].e + hold)
    if (t < until) cur = last
  }
  const next = lines[last + 1]
  const gapAhead = next ? next.t - t : Infinity
  const ended = last === lines.length - 1 && cur < 0
  const section = last >= 0 ? (ended ? 'outro' : lines[last].section) : 'intro'
  const credits = !lines.length || t < lines[0].t - creditsLead || (ended && t > lines.at(-1).e + 2)
  return { last, cur, line: cur >= 0 ? lines[cur] : null, next: next ?? null, gapAhead, ended, section, credits }
}

/** Seconds at which an act starts: { "from": "bridge", "after": 0.8 } or { "at": 120 } */
export function actStart(lines, act) {
  if (typeof act.at === 'number') return act.at
  const fi = lines.findIndex((l) => l.section === act.from)
  if (fi <= 0) return Infinity
  return lines[fi - 1].e + (act.after ?? 0.8)
}

/**
 * Default direction from scene config:
 *   hero.pose  { default, bySection: { chorus: 'chorus' }, breaks: { gap, pose } }
 *   acts       [{ from|at, after, until?, hero: <pose>, lyrics: 'caption'|<layout>|'none' }]
 * Returns { pose, lyrics, inBreak, act }. A project's own director
 * (project.json "director") gets this and returns overrides.
 */
export function direct(lines, t, state, scene = {}) {
  const p = scene.hero?.pose ?? {}
  let pose = p.bySection?.[state.section] ?? p.default ?? 'side'
  const brk = p.breaks ?? { gap: 3, pose: 'center' }
  const inBreak = state.cur < 0 && state.gapAhead > brk.gap
  if (inBreak) pose = brk.pose
  let lyrics = scene.lyrics?.layout ?? 'wheel'
  let act = null
  for (const a of scene.acts ?? []) {
    const from = actStart(lines, a)
    const until = a.until != null ? actStart(lines, { ...a, from: a.until, at: typeof a.until === 'number' ? a.until : undefined }) : Infinity
    if (t >= from && t < until) {
      act = a
      if (a.hero) pose = a.hero
      if (a.lyrics) lyrics = a.lyrics
    }
  }
  return { pose, lyrics, inBreak, act }
}

/** Lines tagged with emphasis / pop from the project's regexes. */
export function tagLines(lines, { emphasis = [], pop = [] } = {}) {
  const re = (list) => list.map((s) => new RegExp(s, 'i'))
  const em = re(emphasis)
  const po = re(pop)
  return lines.map((l) => ({ ...l, emphasis: em.some((r) => r.test(lineText(l))), pop: po.some((r) => r.test(lineText(l))) }))
}

/**
 * Time reference used across project.json: a number of seconds, a section
 * name ("chorus" = its first line, "chorus#2" = its second run), "line:12"
 * (1-based line), "end", or any of these with "+1.5" / "-2".
 */
export function resolveTime(lines, ref, duration = Infinity) {
  if (typeof ref === 'number') return ref
  if (ref == null) return 0
  const m = /^\s*([^+-]+?)\s*(?:([+-])\s*([\d.]+))?\s*$/.exec(String(ref))
  if (!m) throw new Error(`bad time "${ref}"`)
  const off = m[2] ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0
  const key = m[1]
  let base
  if (/^[\d.]+$/.test(key)) base = Number(key)
  else if (key === 'start') base = 0
  else if (key === 'end') base = duration
  else if (/^line:\d+$/.test(key)) base = lines[Number(key.slice(5)) - 1]?.t ?? NaN
  else {
    const [name, nth = '1'] = key.split('#')
    let run = 0
    base = NaN
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].section === name && (i === 0 || lines[i - 1].section !== name) && ++run === Number(nth)) {
        base = lines[i].t
        break
      }
    }
  }
  if (Number.isNaN(base)) throw new Error(`time "${ref}" not found in the lyrics`)
  return base + off
}
