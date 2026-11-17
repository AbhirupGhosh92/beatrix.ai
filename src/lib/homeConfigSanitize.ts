// A CMS typo must never break the landing page: every key of the home config has to be a string,
// and anything else is replaced by the example's value for that key.
import type { HomeConfig } from '../data/homeConfig.ts'
import { isObject } from './jsonDefaults.ts'

/** `aboutHref` must be a path on this site (starts with a single slash). */
function validPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//')
}

export function sanitizeHomeConfig(value: unknown, example: HomeConfig, warn?: (message: string) => void): HomeConfig {
  const source = isObject(value) ? value : {}
  const out = { ...example } as unknown as Record<string, string>
  for (const key of Object.keys(example) as (keyof HomeConfig)[]) {
    const candidate = source[key]
    if (typeof candidate !== 'string') {
      if (candidate !== undefined) warn?.(`home-config.json: "${key}" must be text, using the example value.`)
      continue
    }
    if (key === 'aboutHref' && !validPath(candidate)) {
      warn?.('home-config.json: "aboutHref" must be a path on this site, using the example value.')
      continue
    }
    out[key] = candidate
  }
  return out as unknown as HomeConfig
}
