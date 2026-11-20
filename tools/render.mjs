// Frame-accurate renderer: drives the engine with Playwright's fake clock,
// screenshots every frame and pipes them into ffmpeg, in resumable chunks.
//
//   node tools/render.mjs --track <slug> [--projects tracks] [--format wide|vertical]
//        [--res hd|fhd|4k|8k] [--fps 30|60] [--quality draft|master|compat] [--range 48,92]
//        [--highlight word|line|wipe|none] [--shard k/n] [--workers 3] [--stills 8,66]
//        [--thumbnail hero,line,macro,promo] [--out out] [--no-build]
//
// The engine is built for this one project first (into <out>/dist-<slug>),
// and the project folder is served next to it under /p/.
// Without --shard everything is rendered and merged into out/<name>.mp4.
// With --shard k/n only every n-th chunk (offset k) is rendered and left in
// the chunks directory; tools/merge.mjs joins them (that is how the GitHub
// workflow spreads one video over many machines).
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { chromium } from 'playwright'
import { build } from 'vite'
import { MIME, serveProjects } from '../engine/vite/plugin.js'
import { QUALITY, ROOT, chunkFile, color, parseArgs, plan, scaleFactor, viewport } from './lib.mjs'
import { merge } from './merge.mjs'
import { loadConfig, prepareFrames } from './frames.mjs'

const WARMUP = 4 // seconds stepped through (not captured) before each chunk

const o = parseArgs()
const q = QUALITY[o.quality]
o.dpr = scaleFactor(o)
const framesDir = join(o.out, `frames-${o.name}`)

if (o.build) {
  Object.assign(process.env, { LMS_PROJECTS: o.projects, LMS_TRACK: o.track, LMS_DIST: o.dist })
  await build({ configFile: join(ROOT, 'vite.config.js'), logLevel: 'warn' })
}

const projectFiles = serveProjects(o.projects)
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (pathname.startsWith('/p/')) return projectFiles(Object.assign(req, { url: req.url.slice(2) }), res)
  const path = pathname.startsWith('/frames/') ? join(framesDir, pathname.slice(8)) : join(o.dist, pathname.replace(/\/$/, '/index.html'))
  let body
  try {
    body = await readFile(path)
  } catch {
    if (!pathname.endsWith('.map')) console.error(`404 ${pathname}`)
    return res.writeHead(404).end()
  }
  res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' }).end(body)
}).listen(0)
const url = `http://127.0.0.1:${server.address().port}/index.html?render&track=${o.track}&format=${o.format}&dpr=${o.dpr}&fps=${o.fps}${o.highlight ? `&highlight=${o.highlight}` : ''}`

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
  // blocks that load per frame (video frames, photos) are done drawing
  await page.evaluate(() => window.__lms?.settled())
}

// Video backgrounds: extract the source frames of render frames [a, b) into
// frames-<name>/<sub>/ and point the page at them (see tools/frames.mjs).
async function frames(page, a, b, sub) {
  const used = await prepareFrames(o, Math.max(0, a), b, join(framesDir, sub))
  if (used && page) await page.evaluate((base) => (window.__lms.frames = base), `frames/${sub}`)
  return used ? () => rm(join(framesDir, sub), { recursive: true, force: true }) : () => {}
}

async function renderChunk(page, c) {
  const [from, to] = c
  const done = await frames(page, from - WARMUP * o.fps, to, `c${from}`)
  for (let f = Math.max(0, from - WARMUP * o.fps); f < from; f++) await step(page, f / o.fps)
  const tmp = chunkFile(o, c).replace('.mp4', '.part.mp4')
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(o.fps), '-c:v', 'mjpeg', '-i', '-',
    ...color(o), ...q.codec, '-r', String(o.fps), tmp], { stdio: ['pipe', 'inherit', 'inherit'] })
  const closed = new Promise((r) => ff.on('close', r))
  for (let f = from; f < to; f++) {
    await step(page, f / o.fps)
    const buf = await page.screenshot({ type: 'jpeg', quality: q.jpeg })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
  }
  ff.stdin.end()
  if ((await closed) !== 0) throw new Error(`ffmpeg failed on chunk ${from}-${to}`)
  await rename(tmp, chunkFile(o, c))
  await done()
}

await mkdir(o.out, { recursive: true })

if (o.thumbnail) {
  // YouTube thumbnails: 1920x1080 JPEG (YouTube wants 16:9, under 2 MB);
  // --format vertical makes 1080x1920 Shorts covers
  const cfg = await loadConfig(o.dir, o.project, o.format)
  const f = Math.round((cfg.thumbnails.t ?? 0) * o.fps)
  const done = await frames(null, f, f + 1, 'thumbnail')
  for (const v of o.thumbnail) {
    const page = await browser.newPage({ viewport: viewport(o) })
    page.on('pageerror', (e) => console.error('page error:', e.message))
    await page.addInitScript(() => (window.__lms = { frames: 'frames/thumbnail' }))
    await page.goto(`${url}&thumbnail=${v}`)
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 })
    await page.evaluate(() => window.__lms?.settled())
    const path = `${o.out}/${o.track}-thumbnail-${o.format === 'vertical' ? 'vertical-' : ''}${v}.jpg`
    await page.screenshot({ path, type: 'jpeg', quality: 92 })
    await page.close()
    console.log('thumbnail', path)
  }
  await done()
} else if (o.stills) {
  const page = await openPage()
  for (const s of o.stills) {
    const done = await frames(page, Math.round((s - WARMUP) * o.fps), Math.round(s * o.fps) + 1, `s${s}`)
    for (let t = Math.max(0, s - WARMUP); t < s; t += 1 / o.fps) await step(page, t)
    await step(page, s)
    const path = `${o.out}/${o.track}-${o.format}${o.res === 'fhd' ? '' : `-${o.res}`}-${s}.png`
    await page.screenshot({ path })
    await done()
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
