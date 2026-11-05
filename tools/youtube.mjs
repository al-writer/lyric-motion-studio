// Prints the parts of a YouTube description that come from a prepared track:
// chapters (from the lyric sections) and the lyrics themselves.
//   node tools/youtube.mjs --track <slug>
// Upload tracks/<slug>/build/lyrics.srt as subtitles for synced lyrics.
import { readFileSync } from 'node:fs'
import { ROOT, parseArgs } from './lib.mjs'

const o = parseArgs()
const { lines } = JSON.parse(readFileSync(`${ROOT}tracks/${o.track}/build/lyrics.json`, 'utf8'))
const NAMES = { intro: 'Intro', verse: 'Verse', pre: 'Pre-Chorus', chorus: 'Chorus', bridge: 'Bridge', outro: 'Outro' }
const stamp = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

// sections in order of appearance
const sections = []
for (const l of lines) if (sections.at(-1)?.section !== l.section) sections.push({ section: l.section, t: l.t, lines: [] })
for (const l of lines) {
  const s = sections.findLast((x) => x.t <= l.t)
  s.lines.push(l.words.map((w) => w.w).join(' '))
}

const count = {}
const total = Object.fromEntries(Object.keys(NAMES).map((k) => [k, sections.filter((s) => s.section === k).length]))
const titled = sections.map((s, i) => {
  count[s.section] = (count[s.section] ?? 0) + 1
  let name = NAMES[s.section] ?? s.section
  if (s.section === 'verse' && total.verse > 1) name += ` ${count.verse}`
  if (s.section === 'chorus' && count.chorus === total.chorus && total.chorus > 2) name = 'Final Chorus'
  return { ...s, name }
})

// YouTube chapters: start at 0:00, at least 3, each at least 10 s long.
// A chapter that would be too short is folded into the one before it.
const chapters = []
for (const c of [{ name: 'Intro', t: 0 }, ...titled.map((s) => ({ name: s.name, t: Math.max(0, s.t - 0.5) }))]) {
  if (chapters.length > 1 && c.t - chapters.at(-1).t < 10) chapters.pop()
  chapters.push(c)
}
console.log('CHAPTERS')
for (const c of chapters) console.log(`${stamp(c.t)} ${c.name}`)
console.log('\nLYRICS')
for (const s of titled) console.log(`[${s.name}]\n${s.lines.join('\n')}\n`)
