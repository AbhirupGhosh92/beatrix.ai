// Landing page config, read server-side from the `getHomeConfig` Cloud Function (Firebase Storage,
// cms/home-config.json). Missing keys come from the committed example, bad values are replaced by
// sanitizeHomeConfig, and an unreachable function keeps the last good copy or the example, so the
// landing page always renders.
import 'server-only'
import type { HomeConfig } from '../data/homeConfig.ts'
import defaults from '../data/home-config.example.json'
import { isObject, withDefaults, type Json } from '../lib/jsonDefaults.ts'
import { sanitizeHomeConfig } from '../lib/homeConfigSanitize.ts'
import { callCloudFunction } from './cloudFunctions.ts'

const CACHE_TTL_MS = 30_000
const example = defaults as unknown as HomeConfig

let cache: { at: number; value: HomeConfig } | undefined
let inFlight: Promise<HomeConfig> | undefined

function parse(content: string): HomeConfig {
  const stored: unknown = JSON.parse(content)
  const merged = withDefaults(defaults as Json, isObject(stored) ? stored : {})
  return sanitizeHomeConfig(merged, example, (message) => console.warn(message))
}

async function load(): Promise<HomeConfig> {
  let value: HomeConfig | undefined
  try {
    const { content } = await callCloudFunction<{ content: string | null }>('getHomeConfig')
    value = content ? parse(content) : undefined
  } catch (err) {
    if (cache) return cache.value
    console.warn('getHomeConfig function unavailable, using the example:', err instanceof Error ? err.message : err)
  }
  value ??= example
  cache = { at: Date.now(), value }
  return value
}

export async function getHomeConfig(): Promise<HomeConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  inFlight ??= load().finally(() => {
    inFlight = undefined
  })
  return inFlight
}
