// Puts videos into a draft GitHub release of the repository the workflow runs
// for (plain .mp4 assets, served from GitHub's CDN, visible only to people
// with write access until published).
//
//   node tools/release.mjs --tag render-123 --title "slug · render 123" --notes "…" videos/*.mp4
//
// Needs GITHUB_TOKEN (contents: write) and GITHUB_REPOSITORY. Files over
// GitHub's 2 GiB asset limit are skipped with a warning (they stay in R2).
import { createReadStream, statSync } from 'node:fs'
import { basename } from 'node:path'
import { parseArgs } from 'node:util'

const { values: o, positionals: files } = parseArgs({
  allowPositionals: true,
  options: { tag: { type: 'string' }, title: { type: 'string' }, notes: { type: 'string', default: '' }, target: { type: 'string' } },
})
const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, GITHUB_API_URL: api = 'https://api.github.com', GITHUB_SHA } = process.env
if (!o.tag || !token || !repo) throw new Error('usage: GITHUB_TOKEN=… GITHUB_REPOSITORY=… release.mjs --tag <tag> [--title] [--notes] files…')
const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }
const LIMIT = 2 * 1024 ** 3

const r = await fetch(`${api}/repos/${repo}/releases`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ tag_name: o.tag, name: o.title ?? o.tag, body: o.notes, draft: true, target_commitish: o.target ?? GITHUB_SHA }),
})
if (!r.ok) throw new Error(`create release: ${r.status} ${await r.text()}`)
const release = await r.json()
const uploadUrl = release.upload_url.replace(/\{.*\}$/, '')

const skipped = []
for (const file of files) {
  const size = statSync(file).size
  if (size >= LIMIT) {
    skipped.push(file)
    console.log(`::warning::${basename(file)} is ${(size / 1024 ** 3).toFixed(2)} GiB, over GitHub's 2 GiB asset limit: not attached`)
    continue
  }
  const up = await fetch(`${uploadUrl}?name=${encodeURIComponent(basename(file))}`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'video/mp4', 'content-length': String(size) },
    body: createReadStream(file),
    duplex: 'half',
  })
  if (!up.ok) throw new Error(`upload ${basename(file)}: ${up.status} ${await up.text()}`)
  console.log(`attached ${basename(file)} (${(size / 1e6).toFixed(1)} MB)`)
}
console.log(release.html_url)
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Draft release: ${release.html_url}\n${skipped.length ? `Not attached (over 2 GiB): ${skipped.map((f) => basename(f)).join(', ')}\n` : ''}`)
}
