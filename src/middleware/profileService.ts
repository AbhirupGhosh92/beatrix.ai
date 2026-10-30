// Public profile for the landing page: read server-side from the `getProfile` Cloud Function
// (Firebase Storage). If it is unreachable or no profile has been saved yet, this falls back to
// src/data/profile.json (dev only) and then to the committed example, so the site always renders.
import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { DrawerItem, Profile } from '../data/profile.ts'
import defaults from '../data/profile.example.json'
import { isObject, withDefaults, type Json } from '../lib/jsonDefaults.ts'
import { callCloudFunction } from './cloudFunctions.ts'

const CACHE_TTL_MS = 30_000

let cache: { at: number; value: Profile } | undefined

/**
 * Drawer items from an older profile are plain strings. Read those, and any entry without an
 * explicit `enabled: true`, as disabled so a stored profile can never surface a link by accident.
 */
function normalizeDrawerItems(items: unknown): DrawerItem[] {
  if (!Array.isArray(items)) return []
  return items.map((item, index): DrawerItem => {
    if (typeof item === 'string') {
      return { id: `legacy-${index}`, label: item, href: '', icon: 'circle', enabled: false }
    }
    const o = isObject(item) ? item : {}
    return {
      id: typeof o.id === 'string' ? o.id : `item-${index}`,
      label: typeof o.label === 'string' ? o.label : '',
      href: typeof o.href === 'string' ? o.href : '',
      icon: o.icon === 'file-text' ? 'file-text' : 'circle',
      enabled: o.enabled === true,
    }
  })
}

function parse(content: string): Profile {
  const profile = withDefaults(defaults as Json, JSON.parse(content) as Json) as unknown as Profile
  profile.nav.drawerItems = normalizeDrawerItems(profile.nav.drawerItems)
  return profile
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
