// Latest GitHub release for the "what's new" modal: read server-side from the public GitHub API
// (no token needed) and cached, so the browser never calls GitHub. Any failure yields null (or
// the last good copy) and the page simply omits the version control.
import 'server-only'

export interface LatestRelease {
  /** Tag, for example `v1.2.1`. */
  version: string
  name: string
  notes: string
}

const CACHE_TTL_MS = 10 * 60_000
const REPO = process.env.RELEASES_REPO || 'AbhirupGhosh92/beatrix.ai'

let cache: { at: number; value: LatestRelease | null } | undefined

export async function getLatestRelease(): Promise<LatestRelease | null> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    if (res.status === 404) {
      cache = { at: Date.now(), value: null }
      return null
    }
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
    const data = (await res.json()) as { tag_name?: unknown; name?: unknown; body?: unknown }
    const version = typeof data.tag_name === 'string' ? data.tag_name : ''
    const value: LatestRelease | null = version
      ? {
          version,
          name: typeof data.name === 'string' && data.name ? data.name : version,
          notes: typeof data.body === 'string' ? data.body : '',
        }
      : null
    cache = { at: Date.now(), value }
    return value
  } catch (err) {
    console.warn('Latest release unavailable:', err instanceof Error ? err.message : err)
    // Keep the last good copy, and retry soon rather than on every request.
    cache = { at: Date.now() - CACHE_TTL_MS + 30_000, value: cache?.value ?? null }
    return cache.value
  }
}
