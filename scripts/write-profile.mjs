// Writes src/data/profile.json from the PROFILE_JSON env var (a Firebase secret at build time).
// Without it, the build falls back to src/data/profile.example.json.
import { mkdirSync, writeFileSync } from 'node:fs'

const raw = process.env.PROFILE_JSON

if (!raw) {
  console.log('PROFILE_JSON is not set; falling back to profile.example.json')
  process.exit(0)
}

try {
  JSON.parse(raw)
} catch (err) {
  console.error(`PROFILE_JSON is not valid JSON: ${err.message}`)
  process.exit(1)
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/profile.json', raw)
console.log('Wrote src/data/profile.json from PROFILE_JSON')
