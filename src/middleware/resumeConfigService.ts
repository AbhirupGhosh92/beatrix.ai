// Resume builder config, read server-side from the `getResumeConfig` Cloud Function (Firebase
// Storage, cms/resume-config.json). Missing keys come from the committed example, bad values are
// replaced or dropped by sanitizeResumeConfig, and an unreachable function keeps the last good
// copy or the example, so the builder never breaks over config.
import 'server-only'
import type { ResumeConfig } from '../data/resumeConfig.ts'
import defaults from '../data/resume-config.example.json'
import { isObject, withDefaults, type Json } from '../lib/jsonDefaults.ts'
import { sanitizeResumeConfig } from '../lib/resumeConfigSanitize.ts'
import { callCloudFunction } from './cloudFunctions.ts'

const CACHE_TTL_MS = 30_000
const example = defaults as unknown as ResumeConfig

let cache: { at: number; value: ResumeConfig } | undefined
let inFlight: Promise<ResumeConfig> | undefined

function parse(content: string): ResumeConfig {
  const stored: unknown = JSON.parse(content)
  const merged = withDefaults(defaults as Json, isObject(stored) ? stored : {})
  return sanitizeResumeConfig(merged, example, (message) => console.warn(message))
}

async function load(): Promise<ResumeConfig> {
  let value: ResumeConfig | undefined
  try {
    const { content } = await callCloudFunction<{ content: string | null }>('getResumeConfig')
    value = content ? parse(content) : undefined
  } catch (err) {
    if (cache) return cache.value
    console.warn('getResumeConfig function unavailable, using the example:', err instanceof Error ? err.message : err)
  }
  value ??= sanitizeResumeConfig(defaults as Json, example)
  cache = { at: Date.now(), value }
  return value
}

export async function getResumeConfig(): Promise<ResumeConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  inFlight ??= load().finally(() => {
    inFlight = undefined
  })
  return inFlight
}
