// Every runtime config (profile, resume config, home config) is read through this one loader and
// the single `getConfig` Cloud Function, named by the file constants in src/data/configFiles.ts.
// Each config keeps its own parsing and fallback: an unreachable function keeps the last good copy,
// and with none yet the fallback (the committed example) is used, so the site always renders.
import 'server-only'
import type { ConfigFile } from '../data/configFiles.ts'
import { callCloudFunction } from './cloudFunctions.ts'

const CACHE_TTL_MS = 30_000

interface Options<T> {
  file: ConfigFile
  /** Turns the stored JSON text into the config (merging the example, sanitizing). */
  parse: (content: string) => T
  /** The config when nothing is stored and nothing was cached. */
  fallback: () => T
}

/** A cached (~30s) server-side getter for one config file. */
export function configLoader<T>({ file, parse, fallback }: Options<T>): () => Promise<T> {
  let cache: { at: number; value: T } | undefined
  let inFlight: Promise<T> | undefined

  async function load(): Promise<T> {
    let value: T | undefined
    try {
      const { content } = await callCloudFunction<{ content: string | null }>('getConfig', { file })
      value = content ? parse(content) : undefined
    } catch (err) {
      // Keep serving the last good copy if the function hiccups.
      if (cache) return cache.value
      console.warn(`getConfig(${file}) unavailable, using the fallback:`, err instanceof Error ? err.message : err)
    }
    value ??= fallback()
    cache = { at: Date.now(), value }
    return value
  }

  return async () => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
    // Concurrent callers (layout, metadata, proxy) share one request.
    inFlight ??= load().finally(() => {
      inFlight = undefined
    })
    return inFlight
  }
}
