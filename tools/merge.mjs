// Joins rendered chunks and the track's audio into out/<name>.mp4.
//   node tools/merge.mjs --track <slug> [same options as render.mjs]
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { ROOT, parseArgs, plan } from './lib.mjs'

const run = (args) => new Promise((r, j) => spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error(`ffmpeg exited ${c}`)) : r())))

export async function merge(o) {
  // Chunks may come from machines with different worker counts, so trust the
  // files on disk, but check they cover the whole range without gaps.
  const files = readdirSync(o.chunksDir).filter((f) => /^c-\d+-\d+\.mp4$/.test(f)).sort()
  const spans = files.map((f) => f.match(/c-(\d+)-(\d+)/).slice(1).map(Number))
  const [first] = plan(o)[0]
  const last = plan(o).at(-1)[1]
  let at = first
  for (const [a, b] of spans) {
    if (a !== at) throw new Error(`missing frames ${at}-${a} in ${o.chunksDir}`)
    at = b
  }
  if (at !== last) throw new Error(`missing frames ${at}-${last} in ${o.chunksDir}`)

  const dir = `${ROOT}tracks/${o.track}`
  const song = ['mp3', 'wav', 'm4a', 'flac'].map((e) => `${dir}/song.${e}`).find(existsSync)
  await writeFile(`${o.chunksDir}/list.txt`, files.map((f) => `file '${f}'`).join('\n'))
  const out = `${o.out}/${o.name}.mp4`
  await run(['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${o.chunksDir}/list.txt`,
    '-ss', String(o.from), '-t', String(o.to - o.from), '-i', song,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
    '-shortest', '-movflags', '+faststart', out])
  console.log('done', out)
  return out
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await merge(parseArgs())
