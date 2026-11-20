// A CMS typo must never break the blog: every key is checked on its own and an invalid value is
// replaced by the example's. The admin is always a writer, so the owner cannot lock themselves out.
import { BLOG_LIMITS, BLOG_TEXT_MAX } from '../data/blogConfig.ts'
import type { BlogConfig, PublicBlogConfig } from '../data/blogConfig.ts'
import { ROLES, isRole } from './access.ts'
import { isObject } from './jsonDefaults.ts'

type Warn = ((message: string) => void) | undefined
type NumericKey = keyof typeof BLOG_LIMITS
const NUMERIC_KEYS = Object.keys(BLOG_LIMITS) as NumericKey[]

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= BLOG_TEXT_MAX
}

export function sanitizeBlogConfig(value: unknown, example: BlogConfig, warn?: Warn): BlogConfig {
  const source = isObject(value) ? value : {}
  const out: BlogConfig = { ...example, writeRoles: [...example.writeRoles], home: { ...example.home } }

  if (source.enabled !== undefined) {
    if (typeof source.enabled === 'boolean') out.enabled = source.enabled
    else warn?.('blog-config.json: "enabled" must be true or false, using the example value.')
  }

  for (const key of NUMERIC_KEYS) {
    const candidate = source[key]
    if (candidate === undefined) continue
    const { min, max } = BLOG_LIMITS[key]
    if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= min && candidate <= max) {
      out[key] = candidate
    } else {
      warn?.(`blog-config.json: "${key}" must be a whole number from ${min} to ${max}, using the example value.`)
    }
  }

  // Deprecated key: a character is at least one byte, so the old byte limit is never stricter as a
  // character limit. Used only when maxBodyLength is absent or invalid.
  const legacy = source.maxBodyBytes
  if (legacy !== undefined) {
    const { min, max } = BLOG_LIMITS.maxBodyLength
    const validNew = typeof source.maxBodyLength === 'number' && Number.isInteger(source.maxBodyLength) && source.maxBodyLength >= min && source.maxBodyLength <= max
    if (!validNew) {
      if (typeof legacy === 'number' && Number.isInteger(legacy) && legacy >= min) {
        out.maxBodyLength = Math.min(legacy, max)
        warn?.('blog-config.json: "maxBodyBytes" is deprecated, use "maxBodyLength" (characters); derived it from the old value.')
      } else {
        warn?.('blog-config.json: "maxBodyBytes" is deprecated and invalid, using the example value.')
      }
    }
  }

  const list = source.writeRoles
  if (list !== undefined) {
    if (Array.isArray(list) && list.every(isRole)) {
      out.writeRoles = ROLES.filter((role) => list.includes(role))
    } else {
      warn?.('blog-config.json: "writeRoles" must be a list of known roles, using the example list.')
    }
  }
  if (!out.writeRoles.includes('admin')) out.writeRoles = [...out.writeRoles, 'admin']

  if (source.home !== undefined) {
    const home = isObject(source.home) ? source.home : {}
    for (const key of ['heading', 'intro'] as const) {
      const candidate = home[key]
      if (candidate === undefined) continue
      if (text(candidate)) out.home[key] = candidate
      else warn?.(`blog-config.json: "home.${key}" must be short text, using the example value.`)
    }
  }
  return out
}

/** The subset of the config the browser may see. */
export function publicBlogConfig(config: BlogConfig): PublicBlogConfig {
  return { enabled: config.enabled, writeRoles: config.writeRoles, maxCommentLength: config.maxCommentLength, home: config.home }
}
