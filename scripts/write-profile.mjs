// Downloads the profile JSON from PROFILE_JSON_URL (a Firebase secret at build time) and writes it
// to src/data/profile.json. Without it, the build falls back to src/data/profile.example.json.
//
// - gs://bucket/path/profile.json: read from a private bucket as the build's service account
//   (token from the metadata server; GOOGLE_OAUTH_ACCESS_TOKEN overrides it for local runs, e.g.
//   `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)`).
// - https://...: fetched as-is (public or signed URL).
import { mkdirSync, writeFileSync } from 'node:fs'

const TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token'

const url = process.env.PROFILE_JSON_URL

if (!url) {
  console.log('PROFILE_JSON_URL is not set; falling back to profile.example.json')
  process.exit(0)
}

async function accessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN
  const res = await fetch(TOKEN_URL, {
    headers: { 'Metadata-Flavor': 'Google' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`metadata server returned HTTP ${res.status}`)
  return (await res.json()).access_token
}

async function download(target) {
  if (!target.startsWith('gs://')) return fetch(target, { signal: AbortSignal.timeout(30_000) })
  const [bucket, ...rest] = target.slice('gs://'.length).split('/')
  if (!bucket || rest.length === 0) throw new Error(`invalid gs:// URL: ${target}`)
  const object = encodeURIComponent(rest.join('/'))
  return fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${object}?alt=media`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    signal: AbortSignal.timeout(30_000),
  })
}

let raw
try {
  const res = await download(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  raw = await res.text()
} catch (err) {
  console.error(`Could not download the profile JSON: ${err.message}`)
  process.exit(1)
}

try {
  JSON.parse(raw)
} catch (err) {
  console.error(`Downloaded profile is not valid JSON: ${err.message}`)
  process.exit(1)
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/profile.json', raw)
console.log('Wrote src/data/profile.json from PROFILE_JSON_URL')
