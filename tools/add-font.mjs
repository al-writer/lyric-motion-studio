// Copies a Fontsource font into a project, so the project brings its own
// fonts and the studio's package.json never changes:
//
//   node tools/add-font.mjs --track <slug> --font @fontsource-variable/lora [--css index.css,wght-italic.css]
//        [--projects tracks]
//
// Writes <project>/assets/fonts/<name>/ (woff2 files + LICENSE) and
// <project>/assets/fonts-<name>.css with the @font-face rules (all subsets,
// so browsers fetch only the unicode ranges a page uses). The family name
// to put into project.json "fonts" is printed.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values: o } = parseArgs({
  options: { track: { type: 'string' }, font: { type: 'string' }, css: { type: 'string', default: 'index.css' }, projects: { type: 'string', default: process.env.LMS_PROJECTS || 'tracks' } },
})
if (!o.track || !o.font) throw new Error('usage: add-font.mjs --track <slug> --font @fontsource/<name> [--css index.css,…]')
const project = resolve(o.projects, o.track)
if (!existsSync(join(project, 'project.json'))) throw new Error(`no project at ${project}`)

const tmp = mkdtempSync(join(tmpdir(), 'font-'))
execFileSync('npm', ['pack', o.font, '--silent', '--pack-destination', tmp], { stdio: ['ignore', 'pipe', 'inherit'] })
execFileSync('sh', ['-c', `cd "${tmp}" && tar xzf *.tgz`])
const pkg = join(tmp, 'package')
const name = o.font.split('/').pop()
const dest = join(project, 'assets', 'fonts', name)
mkdirSync(dest, { recursive: true })

let css = `/* ${o.font} (${JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version}), added by tools/add-font.mjs */\n`
const families = new Set()
for (const file of o.css.split(',')) {
  const src = readFileSync(join(pkg, file), 'utf8')
  for (const m of src.matchAll(/font-family:\s*'([^']+)'/g)) families.add(m[1])
  css += src.replace(/url\(\.\/files\/([^)]+)\)/g, (_, f) => {
    if (f.endsWith('.woff2')) cpSync(join(pkg, 'files', f), join(dest, f))
    return `url(./fonts/${name}/${f})`
  })
  css += '\n'
}
// keep only woff2 sources (woff fallbacks are not copied)
css = css.replace(/,\s*url\([^)]+\.woff\)\s*format\('woff'\)/g, '')
if (existsSync(join(pkg, 'LICENSE'))) cpSync(join(pkg, 'LICENSE'), join(dest, 'LICENSE'))
writeFileSync(join(project, 'assets', `fonts-${name}.css`), css)
rmSync(tmp, { recursive: true, force: true })
console.log(`assets/fonts-${name}.css → family: ${[...families].map((f) => `"${f}"`).join(', ')}`)
