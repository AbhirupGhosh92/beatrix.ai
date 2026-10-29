// Server-only storage for the profile JSON.
//
// - PROFILE_JSON_URL=gs://bucket/object: the profile is read from (and written back to) that
//   Cloud Storage object at runtime, authenticating as the App Hosting service account via the
//   metadata server (GOOGLE_OAUTH_ACCESS_TOKEN overrides it for local runs, e.g.
//   `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)`).
// - Otherwise (local dev): src/data/profile.json, falling back to the committed example.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Profile } from '../data/profile.ts'
import defaults from '../data/profile.example.json'

const TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token'
const DATA_DIR = path.join(process.cwd(), 'src', 'data')
const CACHE_TTL_MS = 30_000

export interface StoredProfile {
  content: string
  size: number
  updatedAt: string | null
  /** false when the content is the committed example fallback */
  exists: boolean
}

let cache: { at: number; value: StoredProfile } | undefined

export function isGcsConfigured(): boolean {
  return Boolean(process.env.PROFILE_JSON_URL?.startsWith('gs://'))
}

function gcsObject(): { bucket: string; object: string } {
  const url = process.env.PROFILE_JSON_URL ?? ''
  const [bucket, ...rest] = url.slice('gs://'.length).split('/')
  if (!bucket || rest.length === 0) throw new Error(`invalid PROFILE_JSON_URL: ${url}`)
  return { bucket, object: rest.join('/') }
}

export async function googleAccessToken(): Promise<string> {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN
  const res = await fetch(TOKEN_URL, {
    headers: { 'Metadata-Flavor': 'Google' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`metadata server returned HTTP ${res.status}`)
  return (await res.json()).access_token
}

async function readGcs(): Promise<StoredProfile> {
  const { bucket, object } = gcsObject()
  const base = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}`
  const headers = { Authorization: `Bearer ${await googleAccessToken()}` }
  const [meta, body] = await Promise.all([
    fetch(base, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) }),
    fetch(`${base}?alt=media`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) }),
  ])
  if (!body.ok) throw new Error(`GCS read failed: HTTP ${body.status}`)
  const content = await body.text()
  const info = meta.ok ? await meta.json() : {}
  return {
    content,
    size: Number(info.size ?? Buffer.byteLength(content)),
    updatedAt: info.updated ?? null,
    exists: true,
  }
}

function readLocal(): StoredProfile {
  const file = path.join(DATA_DIR, 'profile.json')
  if (existsSync(file)) {
    const stats = statSync(file)
    return {
      content: readFileSync(file, 'utf-8'),
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
      exists: true,
    }
  }
  const content = readFileSync(path.join(DATA_DIR, 'profile.example.json'), 'utf-8')
  return { content, size: Buffer.byteLength(content), updatedAt: null, exists: false }
}

/** Raw profile JSON plus metadata. Cached briefly per instance; pass `fresh` to skip the cache. */
export async function readStoredProfile(fresh = false): Promise<StoredProfile> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  let value: StoredProfile
  try {
    value = isGcsConfigured() ? await readGcs() : readLocal()
  } catch (err) {
    // Keep serving the last good copy if Cloud Storage hiccups.
    if (cache) return cache.value
    throw err
  }
  cache = { at: Date.now(), value }
  return value
}

type Json = Record<string, unknown>
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/** `value` wins; keys it lacks (e.g. a profile saved before a field was added) come from `base`. */
function withDefaults(base: Json, value: Json): Json {
  const out: Json = { ...base }
  for (const [key, v] of Object.entries(value)) {
    const b = base[key]
    out[key] = isObject(b) && isObject(v) ? withDefaults(b, v) : v
  }
  return out
}

export async function getProfile(): Promise<Profile> {
  const stored = JSON.parse((await readStoredProfile()).content) as Json
  return withDefaults(defaults as Json, stored) as unknown as Profile
}

export async function writeStoredProfile(content: string): Promise<StoredProfile> {
  if (isGcsConfigured()) {
    const { bucket, object } = gcsObject()
    const res = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(object)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await googleAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: content,
        signal: AbortSignal.timeout(30_000),
      },
    )
    if (!res.ok) throw new Error(`GCS write failed: HTTP ${res.status} ${await res.text()}`)
  } else {
    writeFileSync(path.join(DATA_DIR, 'profile.json'), content, 'utf-8')
  }
  cache = undefined
  return readStoredProfile(true)
}
