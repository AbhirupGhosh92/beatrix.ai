// Public profile for the landing page: read server-side from the `getProfile` Cloud Function
// (Firebase Storage). If it is unreachable or no profile has been saved yet, this falls back to
// src/data/profile.json (dev only) and then to the committed example, so the site always renders.
import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Profile } from '../data/profile.ts'
import defaults from '../data/profile.example.json'
import { callCloudFunction } from './cloudFunctions.ts'

const CACHE_TTL_MS = 30_000

let cache: { at: number; value: Profile } | undefined

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

function parse(content: string): Profile {
  return withDefaults(defaults as Json, JSON.parse(content) as Json) as unknown as Profile
}

function readLocal(): Profile | undefined {
  if (process.env.NODE_ENV === 'production') return undefined
  const file = path.join(process.cwd(), 'src', 'data', 'profile.json')
  return existsSync(file) ? parse(readFileSync(file, 'utf-8')) : undefined
}

let inFlight: Promise<Profile> | undefined

async function load(): Promise<Profile> {
  let value: Profile | undefined
  try {
    const { content } = await callCloudFunction<{ content: string | null }>('getProfile')
    value = content ? parse(content) : undefined
  } catch (err) {
    // Keep serving the last good copy if the function hiccups.
    if (cache) return cache.value
    console.warn('getProfile function unavailable, using local fallback:', err instanceof Error ? err.message : err)
  }

  value ??= readLocal() ?? parse(JSON.stringify(defaults))
  cache = { at: Date.now(), value }
  return value
}

export async function getProfile(): Promise<Profile> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  // generateMetadata and the layout call this concurrently; share one request.
  inFlight ??= load().finally(() => {
    inFlight = undefined
  })
  return inFlight
}
