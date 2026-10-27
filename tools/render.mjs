// Frame-accurate renderer: drives the engine with Playwright's fake clock,
// screenshots every frame and pipes them into ffmpeg, in resumable chunks.
//
//   node tools/render.mjs --track <slug> [--format wide|vertical] [--res 1080p|4k]
//        [--fps 30|60] [--quality draft|master|compat] [--range 48,92]
//        [--shard k/n] [--workers 3] [--stills 8,66]
//
// Without --shard everything is rendered and merged into out/<name>.mp4.
// With --shard k/n only every n-th chunk (offset k) is rendered and left in
// the chunks directory; tools/merge.mjs joins them (that is how the GitHub
// workflow spreads one video over many machines).
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { chromium } from 'playwright'
import { COLOR, QUALITY, chunkFile, parseArgs, plan, scaleFactor, viewport } from './lib.mjs'
import { merge } from './merge.mjs'

const WARMUP = 4 // seconds stepped through (not captured) before each chunk

const o = parseArgs()
const q = QUALITY[o.quality]

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' }
const server = createServer(async (req, res) => {
  const path = join(o.dist, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'))
  try {
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path))
  } catch {
    res.writeHead(404).end()
  }
}).listen(0)
const url = `http://127.0.0.1:${server.address().port}/index.html?render&track=${o.track}&format=${o.format}`

const browser = await chromium.launch()

async function openPage() {
  const page = await browser.newPage({ viewport: viewport(o), deviceScaleFactor: scaleFactor(o) })
  page.on('pageerror', (e) => console.error('page error:', e.message))
  // Keep Framer Motion on its JS (rAF) path so the fake clock controls it.
  await page.addInitScript(() => delete Element.prototype.animate)
  await page.clock.install({ time: 0 })
  await page.goto(url)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 })
  await page.clock.pauseAt(10_000)
  return page
}

// Let React commit (it schedules work through MessageChannel, which is not faked).
const flush = (page) =>
  page.evaluate(
    () =>
      new Promise((r) => {
        const c = new MessageChannel()
        c.port1.onmessage = () => {
          const d = new MessageChannel()
          d.port1.onmessage = () => r()
          d.port2.postMessage(0)
        }
        c.port2.postMessage(0)
      })
  )

async function step(page, t) {
  await page.evaluate((t) => (window.__T = t), t)
  await page.clock.runFor(1000 / o.fps)
  await flush(page)
}

async function renderChunk(page, c) {
  const [from, to] = c
  for (let f = Math.max(0, from - WARMUP * o.fps); f < from; f++) await step(page, f / o.fps)
  const tmp = chunkFile(o, c).replace('.mp4', '.part.mp4')
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(o.fps), '-c:v', 'mjpeg', '-i', '-',
    ...COLOR, ...q.codec, '-r', String(o.fps), tmp], { stdio: ['pipe', 'inherit', 'inherit'] })
  const closed = new Promise((r) => ff.on('close', r))
  for (let f = from; f < to; f++) {
    await step(page, f / o.fps)
    const buf = await page.screenshot({ type: 'jpeg', quality: q.jpeg })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
  }
  ff.stdin.end()
  if ((await closed) !== 0) throw new Error(`ffmpeg failed on chunk ${from}-${to}`)
  await rename(tmp, chunkFile(o, c))
}

await mkdir(o.out, { recursive: true })

if (o.stills) {
  const page = await openPage()
  for (const s of o.stills) {
    for (let t = Math.max(0, s - WARMUP); t < s; t += 1 / o.fps) await step(page, t)
    await step(page, s)
    const path = `${o.out}/${o.track}-${o.format}-${s}.png`
    await page.screenshot({ path })
    console.log('still', path)
  }
} else {
  await mkdir(o.chunksDir, { recursive: true })
  const all = plan(o)
  const mine = all.filter((_, i) => i % o.shards === o.shard[0])
  const todo = mine.filter((c) => !existsSync(chunkFile(o, c)))
  console.log(`${o.name}: ${all.length} chunks total, shard ${o.shard.join('/')} has ${mine.length}, ${mine.length - todo.length} already done; ${o.workers} workers`)
  const t0 = Date.now()
  let frames = 0
  await Promise.all(
    Array.from({ length: Math.min(o.workers, todo.length) }, async () => {
      const page = await openPage()
      for (let c; (c = todo.shift()); ) {
        await renderChunk(page, c)
        frames += c[1] - c[0]
        const secs = (Date.now() - t0) / 1000
        console.log(`chunk ${c[0]}-${c[1]} done · ${frames} frames in ${secs.toFixed(0)}s (${(frames / secs).toFixed(2)} fps)`)
      }
      await page.close()
    })
  )
  if (o.shards === 1) await merge(o)
}

await browser.close()
server.close()
