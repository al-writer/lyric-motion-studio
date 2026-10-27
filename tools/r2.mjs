// Minimal Cloudflare R2 client for the workflows (works locally too).
//   node tools/r2.mjs put <file|dir> <key|prefix>   dir: uploads c-*.mp4 chunks
//   node tools/r2.mjs get <prefix> <dir>
//   node tools/r2.mjs rm <prefix>
//   node tools/r2.mjs presign <key> [seconds]      prints a temporary download URL
// Needs R2_ACCOUNT_ID, R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
import { createReadStream, createWriteStream, statSync, readdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const { R2_ACCOUNT_ID, R2_BUCKET: Bucket } = process.env
if (!R2_ACCOUNT_ID || !Bucket) throw new Error('R2_ACCOUNT_ID and R2_BUCKET must be set')
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

async function list(Prefix) {
  const keys = []
  let ContinuationToken
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken }))
    keys.push(...(r.Contents ?? []).map((o) => o.Key))
    ContinuationToken = r.NextContinuationToken
  } while (ContinuationToken)
  return keys
}

const put = (file, Key) => new Upload({ client: s3, params: { Bucket, Key, Body: createReadStream(file) }, partSize: 64 * 1024 * 1024, queueSize: 4 }).done()

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
  await mkdir(b, { recursive: true })
  const keys = await list(a)
  for (const Key of keys) {
    const r = await s3.send(new GetObjectCommand({ Bucket, Key }))
    await pipeline(r.Body, createWriteStream(join(b, basename(Key))))
  }
  console.log(`downloaded ${keys.length} files from ${a}`)
} else if (cmd === 'rm') {
  const keys = await list(a)
  for (let i = 0; i < keys.length; i += 1000)
    await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) } }))
  console.log(`deleted ${keys.length} objects under ${a}`)
} else if (cmd === 'presign') {
  console.log(await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: a }), { expiresIn: Number(b ?? 604800) }))
} else {
  throw new Error('usage: r2.mjs put|get|rm|presign …')
}
