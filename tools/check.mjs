// Checks projects before a render: project.json against the schema, named
// components exist, the project is prepared.
//   node tools/check.mjs [--projects tracks] [--track <slug>]   (all projects without --track)
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import Ajv from 'ajv/dist/2020.js'
import { ROOT, projectsDir, readProject } from './lib.mjs'

const { values: o } = parseArgs({ options: { projects: { type: 'string' }, track: { type: 'string' } } })
const dir = projectsDir(o)
const schema = JSON.parse(readFileSync(join(ROOT, 'schema/project.schema.json'), 'utf8'))
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema)

function components(v, out = new Set()) {
  if (Array.isArray(v)) v.forEach((x) => components(x, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (k === 'component' || k === 'director') && typeof x === 'string' ? out.add(x) : components(x, out)
  return out
}

const slugs = o.track ? [o.track] : readdirSync(dir).filter((d) => existsSync(join(dir, d, 'project.json')))
let failed = 0
for (const slug of slugs) {
  const p = join(dir, slug)
  const errors = []
  let project
  try {
    project = readProject(p)
  } catch (e) {
    errors.push(e.message)
  }
  if (project && !validate(project)) for (const e of validate.errors) errors.push(`project.json${e.instancePath} ${e.message}${e.params?.additionalProperty ? `: "${e.params.additionalProperty}"` : ''}`)
  if (project) {
    for (const c of components(project)) if (!existsSync(join(p, 'components', c.replace(/^components\//, '')))) errors.push(`components/${c} does not exist`)
    for (const f of ['build/lyrics.json', 'build/audio.json']) if (!existsSync(join(p, f))) errors.push(`${f} missing: run prepare`)
    if (project.audio && !/^(r2|https?):/.test(project.audio) && !existsSync(join(p, project.audio))) errors.push(`audio ${project.audio} does not exist`)
  }
  console.log(errors.length ? `✗ ${slug}\n${errors.map((e) => `    ${e}`).join('\n')}` : `✓ ${slug}`)
  if (errors.length) failed++
}
process.exitCode = failed ? 1 : 0
