// Deletes a workflow run's artifacts whose name starts with a prefix (and/or
// ends with a suffix).
//
//   node tools/artifacts.mjs delete --run <run id> --prefix chunks-wide-
//   node tools/artifacts.mjs delete --run <run id> --suffix .mp4
//
// Needs GITHUB_TOKEN (with actions: write) and GITHUB_REPOSITORY, both set on
// Actions runners. Used by render.yml to drop the chunk artifacts once the
// merged video exists.
const [cmd, ...rest] = process.argv.slice(2)
const arg = (k) => (rest.includes(`--${k}`) ? rest[rest.indexOf(`--${k}`) + 1] : undefined)
const run = arg('run')
const prefix = arg('prefix') ?? ''
const suffix = arg('suffix') ?? ''
const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, GITHUB_API_URL: api = 'https://api.github.com' } = process.env
if (cmd !== 'delete' || !run || !token || !repo) {
  console.error('usage: GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/repo node tools/artifacts.mjs delete --run <id> [--prefix <p>] [--suffix <s>]')
  process.exit(2)
}
const gh = (path, method = 'GET') =>
  fetch(`${api}/repos/${repo}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
  }).then((r) => {
    if (!r.ok) throw new Error(`${method} ${path}: ${r.status}`)
    return method === 'GET' ? r.json() : null
  })

const found = []
for (let page = 1; ; page++) {
  const { artifacts } = await gh(`/actions/runs/${run}/artifacts?per_page=100&page=${page}`)
  found.push(...artifacts.filter((a) => a.name.startsWith(prefix) && a.name.endsWith(suffix)))
  if (artifacts.length < 100) break
}
let bytes = 0
for (const a of found) {
  await gh(`/actions/artifacts/${a.id}`, 'DELETE')
  bytes += a.size_in_bytes
}
console.log(`deleted ${found.length} artifacts (${(bytes / 1e6).toFixed(1)} MB) matching "${prefix}*${suffix}"`)
