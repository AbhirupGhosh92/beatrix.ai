// Regenerates the auto-managed README sections (npm scripts, source tree).
// Usage: node scripts/update-readme.mjs   (run automatically by .githooks/pre-push)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const README = 'README.md'
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

const scriptsTable = [
  '| Command | Runs |',
  '| --- | --- |',
  ...Object.entries(pkg.scripts).map(([k, v]) => `| \`npm run ${k}\` | \`${v}\` |`),
].join('\n')

function tree(dir, prefix = '') {
  const entries = readdirSync(dir)
    .filter((n) => !n.startsWith('.'))
    .sort((a, b) => Number(statSync(join(dir, a)).isDirectory()) - Number(statSync(join(dir, b)).isDirectory()) || a.localeCompare(b))
  return entries.flatMap((name, i) => {
    const last = i === entries.length - 1
    const isDir = statSync(join(dir, name)).isDirectory()
    const line = `${prefix}${last ? '└── ' : '├── '}${name}${isDir ? '/' : ''}`
    return isDir ? [line, ...tree(join(dir, name), prefix + (last ? '    ' : '│   '))] : [line]
  })
}
const structure = '```text\nsrc/\n' + tree('src').join('\n') + '\n```'

let text = readFileSync(README, 'utf8')
const replace = (name, body) => {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`)
  if (!re.test(text)) throw new Error(`Missing markers for ${name} in ${README}`)
  text = text.replace(re, `$1\n${body}\n$2`)
}
replace('scripts', scriptsTable)
replace('structure', structure)
writeFileSync(README, text)
