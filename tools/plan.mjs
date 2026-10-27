// Prints the GitHub Actions matrix for a render: one entry per format × shard.
//   node tools/plan.mjs --track <slug> --formats wide,vertical --shards 20
import { parseArgs } from './lib.mjs'

const argv = process.argv.slice(2)
const get = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d)
const formats = get('formats', 'wide').split(',')
const shards = Number(get('shards', 20))
parseArgs(['--track', get('track')]) // fails early if the track is not prepared
const include = formats.flatMap((format) => Array.from({ length: shards }, (_, k) => ({ format, shard: `${k}/${shards}` })))
console.log(JSON.stringify({ include }))
