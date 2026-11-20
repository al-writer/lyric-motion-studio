// Minimal Cloudflare R2 client (library and CLI; works locally too).
//   node tools/r2.mjs put <file|dir> <key|prefix>   dir: uploads c-*.mp4 chunks
//   node tools/r2.mjs get <prefix> <dir>
//   node tools/r2.mjs rm <prefix>
//   node tools/r2.mjs presign <key> [seconds]      prints a temporary download URL
// Needs R2_ACCOUNT_ID, R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
import { createReadStream, createWriteStream, readdirSync, statSync } from 'node:fs'
import { mkdir, rename } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'
import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const hasR2 = () => Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET && process.env.AWS_ACCESS_KEY_ID)

let client
function s3() {
  const { R2_ACCOUNT_ID } = process.env
  if (!hasR2()) throw new Error('R2 is not configured: set R2_ACCOUNT_ID, R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY')
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return client
}
const Bucket = () => process.env.R2_BUCKET

export async function list(Prefix) {
  const keys = []
  let ContinuationToken
  do {
    const r = await s3().send(new ListObjectsV2Command({ Bucket: Bucket(), Prefix, ContinuationToken }))
    keys.push(...(r.Contents ?? []).map((o) => o.Key))
    ContinuationToken = r.NextContinuationToken
  } while (ContinuationToken)
  return keys
}

export const put = (file, Key) =>
  new Upload({ client: s3(), params: { Bucket: Bucket(), Key, Body: createReadStream(file) }, partSize: 64 * 1024 * 1024, queueSize: 4 }).done()

export async function exists(Key) {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: Bucket(), Key }))
    return true
  } catch {
    return false
  }
}

/** downloads one object to a file (atomically: .part, then rename) */
export async function download(Key, file) {
  await mkdir(dirname(file), { recursive: true })
  const r = await s3().send(new GetObjectCommand({ Bucket: Bucket(), Key }))
  await pipeline(r.Body, createWriteStream(`${file}.part`))
  await rename(`${file}.part`, file)
}

export async function remove(prefix) {
  const keys = await list(prefix)
  for (let i = 0; i < keys.length; i += 1000)
    await s3().send(new DeleteObjectsCommand({ Bucket: Bucket(), Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) } }))
  return keys.length
}

export const presign = (Key, seconds = 604800) => getSignedUrl(s3(), new GetObjectCommand({ Bucket: Bucket(), Key }), { expiresIn: Number(seconds) })

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, a, b] = process.argv.slice(2)
  if (cmd === 'put') {
    if (statSync(a).isDirectory()) {
      const files = readdirSync(a).filter((f) => /^c-\d+-\d+\.mp4$/.test(f))
      await Promise.all(files.map((f) => put(join(a, f), `${b.replace(/\/$/, '')}/${f}`)))
      console.log(`uploaded ${files.length} chunks to ${b}`)
    } else {
      await put(a, b)
      console.log(`uploaded ${basename(a)} to ${b}`)
    }
  } else if (cmd === 'get') {
    const keys = await list(a)
    for (const Key of keys) await download(Key, join(b, basename(Key)))
    console.log(`downloaded ${keys.length} files from ${a}`)
  } else if (cmd === 'rm') {
    console.log(`deleted ${await remove(a)} objects under ${a}`)
  } else if (cmd === 'presign') {
    console.log(await presign(a, b))
  } else {
    throw new Error('usage: r2.mjs put|get|rm|presign …')
  }
}
