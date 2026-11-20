// Which projects a push needs to prepare, and how (for the prepare workflow):
//   full       audio, lyrics, language or alignment settings changed (or a new project)
//   overrides  only timing.json changed: re-apply the manual fixes, no alignment
// A change of colours, scene or components prepares nothing.
//
//   node tools/changed.mjs [--projects tracks] [--base HEAD~1] [--tracks "a b"]
// prints one "<slug> <mode>" per line. With --tracks, those projects, full.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values: o } = parseArgs({ options: { projects: { type: 'string', default: 'tracks' }, base: { type: 'string', default: 'HEAD~1' }, tracks: { type: 'string' } } })
const dir = resolve(o.projects)
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

if (o.tracks?.trim()) {
  for (const s of o.tracks.trim().split(/[\s,]+/)) console.log(`${s} full`)
  process.exit(0)
}

const top = git('rev-parse', '--show-toplevel').trim()
const rel = relative(top, dir) || '.'
let base = o.base
try {
  git('rev-parse', '--verify', `${base}^{commit}`)
} catch {
  base = git('hash-object', '-t', 'tree', '/dev/null').trim() // first commit: everything is new
}
const files = git('diff', '--name-only', base, 'HEAD', '--', rel).split('\n').filter(Boolean)

const bySlug = {}
for (const f of files) {
  const [slug, ...rest] = relative(rel, f).split('/')
  if (rest.length) (bySlug[slug] ??= []).push(rest.join('/'))
}
const KEYS = (p) => JSON.stringify([p.audio, p.audioSha256, p.language, p.lyrics?.file, p.lyrics?.timing, p.lyrics?.whisperModel, p.media])
const read = (rev, path) => {
  try {
    return JSON.parse(git('show', `${rev}:${path}`))
  } catch {
    return null
  }
}

for (const [slug, changed] of Object.entries(bySlug).sort()) {
  const path = join(rel, slug, 'project.json')
  const now = existsSync(join(dir, slug, 'project.json')) ? read('HEAD', path) : null
  if (!now) continue // removed, or not a project
  const before = read(base, path)
  const own = changed.filter((f) => !f.startsWith('build/'))
  const audioPath = /^(r2|https?):/.test(now.audio ?? '') ? null : now.audio
  let mode = null
  if (!before || KEYS(before) !== KEYS(now)) mode = 'full'
  else if (own.some((f) => /^lyrics\.[a-z]+$/.test(f) || f === now.lyrics?.file || f === audioPath)) mode = 'full'
  else if (own.includes('timing.json')) mode = 'overrides'
  if (mode) console.log(`${slug} ${mode}`)
}
