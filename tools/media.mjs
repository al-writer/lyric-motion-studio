// Media kept outside git: the song and footage live in R2 (or at any https
// URL) and are fetched into <project>/.media/ (git-ignored) when needed.
//
//   node tools/media.mjs fetch --track <slug> [--projects tracks] [--only audio]
//        downloads remote "audio" and "media" sources (checks sha256 when given)
//        and writes build/media.json (kind, size, duration, fps of every item)
//   node tools/media.mjs push --track <slug> --file <path> [--as audio|<id>] [--key <r2 key>]
//        uploads a file to R2 (default key projects/<slug>/<file name>) and points
//        project.json at it: "audio" or "media.<id>" = { src: "r2://…", sha256 }
//   node tools/media.mjs migrate --track <slug>|--all
//        moves every audio / media source that is not in R2 yet (a file in the
//        project or a URL) there; files that were in the project are deleted
//
// R2 needs R2_ACCOUNT_ID, R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { parseArgs } from 'node:util'
import { isRemote, mediaPath } from '../engine/src/lib/media.js'
import { mediaKind } from '../engine/src/lib/timeline.js'
import { projectsDir, readProject } from './lib.mjs'

export async function sha256(file) {
  const h = createHash('sha256')
  await pipeline(createReadStream(file), h)
  return h.digest('hex')
}

async function download(src, file) {
  mkdirSync(dirname(file), { recursive: true })
  if (src.startsWith('r2://')) {
    const r2 = await import('./r2.mjs')
    await r2.download(src.slice(5), file)
    return
  }
  const r = await fetch(src)
  if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`)
  await pipeline(Readable.fromWeb(r.body), createWriteStream(`${file}.part`))
  renameSync(`${file}.part`, file)
}

/** ffprobe summary of a media file */
export function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }))
  const v = j.streams.find((s) => s.codec_type === 'video')
  const rate = (r) => (r ? r.split('/').reduce((a, b) => a / b) : 0)
  const duration = Number(v?.duration ?? j.format.duration ?? 0) || 0
  const fps = Math.round(rate(v?.avg_frame_rate || v?.r_frame_rate) * 1000) / 1000 || 0
  return {
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    duration,
    fps,
    frames: Number(v?.nb_frames) || Math.round(duration * fps),
  }
}

/** all media items of a project: [{ id, src, sha256, kind }] (audio first) */
export function items(project) {
  const out = []
  if (project.audio) out.push({ id: 'audio', src: project.audio, sha256: project.audioSha256, kind: 'audio' })
  for (const [id, m] of Object.entries(project.media ?? {})) out.push({ id, ...m, kind: mediaKind(m) })
  return out
}

/** makes every media item of a project available locally; returns build/media.json */
export async function fetchMedia(dir, { only = null, quiet = false } = {}) {
  const project = readProject(dir)
  const info = {}
  for (const m of items(project)) {
    if (only && !only.includes(m.id)) continue
    const file = join(dir, mediaPath(m.id, m.src))
    if (isRemote(m.src)) {
      const ok = existsSync(file) && (!m.sha256 || (await sha256(file)) === m.sha256)
      if (!ok) {
        if (!quiet) console.log(`fetch ${m.id} ← ${m.src}`)
        await download(m.src, file)
        if (m.sha256 && (await sha256(file)) !== m.sha256) throw new Error(`${m.id}: sha256 does not match ${m.src}`)
      }
    } else if (!existsSync(file)) throw new Error(`${m.id}: ${m.src} does not exist in the project`)
    if (m.id !== 'audio') info[m.id] = { kind: m.kind, ...probe(file) }
  }
  if (!only) {
    mkdirSync(join(dir, 'build'), { recursive: true })
    writeFileSync(join(dir, 'build', 'media.json'), JSON.stringify(info, null, 2) + '\n')
  }
  return info
}

/** moves the project's non-R2 sources to R2; returns the ids moved */
async function migrate(dir, slug) {
  const project = readProject(dir)
  const moved = []
  for (const m of items(project)) {
    if (m.src.startsWith('r2://')) continue
    await fetchMedia(dir, { only: [m.id], quiet: true })
    const file = join(dir, mediaPath(m.id, m.src))
    const name = basename(m.src.split('?')[0])
    await push(dir, slug, file, m.id, `projects/${slug}/${m.id === 'audio' ? name : `${m.id}-${name}`}`)
    if (!isRemote(m.src)) execFileSync('rm', [file]) // the copy in .media/ stays for local use
    moved.push(m.id)
  }
  return moved
}

async function push(dir, slug, file, as, key) {
  const r2 = await import('./r2.mjs')
  const project = readProject(dir)
  key ??= `projects/${slug}/${basename(file)}`
  const hash = await sha256(file)
  console.log(`upload ${file} → r2://${key}`)
  await r2.put(file, key)
  const src = `r2://${key}`
  if (as === 'audio') Object.assign(project, { audio: src, audioSha256: hash })
  else project.media = { ...project.media, [as]: { ...project.media?.[as], src, sha256: hash } }
  writeFileSync(join(dir, 'project.json'), JSON.stringify(project, null, 2) + '\n')
  // keep a local copy where the engine looks for it, out of git
  const local = join(dir, mediaPath(as, src))
  mkdirSync(dirname(local), { recursive: true })
  if (!existsSync(local)) execFileSync('cp', [file, local])
  console.log(`project.json: ${as === 'audio' ? 'audio' : `media.${as}`} = ${src}`)
}

const main = async () => {
  const { positionals: [cmd], values: o } = parseArgs({
    allowPositionals: true,
    options: { track: { type: 'string' }, all: { type: 'boolean' }, projects: { type: 'string' }, only: { type: 'string' }, file: { type: 'string' }, as: { type: 'string' }, key: { type: 'string' } },
  })
  if (cmd === 'migrate') {
    const root = projectsDir(o)
    const slugs = o.all ? readdirSync(root).filter((d) => existsSync(join(root, d, 'project.json'))) : [o.track]
    for (const slug of slugs) {
      const moved = await migrate(join(root, slug), slug)
      console.log(moved.length ? `${slug}: moved ${moved.join(', ')} to R2` : `${slug}: already in R2`)
    }
    return
  }
  if (!o.track) throw new Error('--track <slug> is required')
  const dir = join(projectsDir(o), o.track)
  if (cmd === 'fetch') {
    const info = await fetchMedia(dir, { only: o.only?.split(',') })
    console.log(`media ready: ${['audio', ...Object.keys(info)].join(', ')}`)
  } else if (cmd === 'push') {
    if (!o.file) throw new Error('--file is required')
    await push(dir, o.track, o.file, o.as ?? (/\.(mp3|wav|flac|m4a|ogg)$/i.test(extname(o.file)) ? 'audio' : basename(o.file, extname(o.file))), o.key)
  } else throw new Error('usage: media.mjs fetch|push|migrate --track <slug> …')
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
