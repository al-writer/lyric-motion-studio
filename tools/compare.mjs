// Compares renders with a reference set (stills, thumbnails, clips) by SSIM:
//   node tools/compare.mjs <reference-dir> <new-dir> [--min 0.99] [--diffs <dir>]
// Files are paired by name (recursively). Clips report their worst frame.
// With --diffs, every pair below --min gets a "reference | new | difference" image.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseArgs } from 'node:util'

const { values: o, positionals: [refDir, newDir] } = parseArgs({
  allowPositionals: true,
  options: { min: { type: 'string', default: '0.99' }, diffs: { type: 'string' } },
})
if (!refDir || !newDir) throw new Error('usage: compare.mjs <reference-dir> <new-dir> [--min 0.99] [--diffs dir]')
const min = Number(o.min)

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function ssim(a, b, clip) {
  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${a}" -i "${b}" -lavfi "[0:v][1:v]ssim=stats_file=-" -f null - 2>/dev/null`], { encoding: 'utf8', maxBuffer: 1 << 26 })
  const all = [...log.matchAll(/All:([\d.]+)/g)].map((m) => Number(m[1]))
  if (!all.length) throw new Error(`no SSIM for ${a}`)
  const worst = Math.min(...all)
  return { mean: all.reduce((x, y) => x + y, 0) / all.length, worst, frame: all.indexOf(worst), frames: all.length, clip }
}

let bad = 0
const rows = []
for (const ref of walk(refDir).filter((f) => /\.(png|jpe?g|mp4)$/.test(f))) {
  const rel = relative(refDir, ref)
  const cur = join(newDir, rel)
  if (!existsSync(cur)) {
    rows.push([rel, 'missing'])
    bad++
    continue
  }
  const r = ssim(ref, cur, rel.endsWith('.mp4'))
  const ok = r.worst >= min
  if (!ok) bad++
  rows.push([rel, `${ok ? 'ok ' : 'LOW'} ${r.worst.toFixed(4)}${r.clip ? ` (worst frame ${r.frame}/${r.frames}, mean ${r.mean.toFixed(4)})` : ''}`])
  if (!ok && o.diffs) {
    mkdirSync(o.diffs, { recursive: true })
    const out = join(o.diffs, rel.replace(/[\\/]/g, '__').replace(/\.\w+$/, '.jpg'))
    const sel = r.clip ? ['-vf', `select=eq(n\\,${r.frame})`] : []
    const tmpA = `${out}.a.png`
    const tmpB = `${out}.b.png`
    ff(['-y', '-i', ref, ...sel, '-frames:v', '1', tmpA])
    ff(['-y', '-i', cur, ...sel, '-frames:v', '1', tmpB])
    ff(['-y', '-i', tmpA, '-i', tmpB, '-filter_complex', '[0][1]blend=all_mode=difference,curves=all=0/0 0.1/1 1/1[d];[0][1][d]hstack=3,scale=2400:-2', '-q:v', '3', out])
    execFileSync('rm', [tmpA, tmpB])
  }
}
for (const [f, s] of rows) console.log(`${s.padEnd(60)} ${f}`)
console.log(bad ? `${bad} of ${rows.length} below ${min}` : `all ${rows.length} at or above ${min}`)
process.exitCode = bad ? 1 : 0
