// Blog config, read server-side through the `getConfig` Cloud Function (cms/blog-config.json). Missing
// keys come from the committed example, bad values are replaced by sanitizeBlogConfig, and an
// unreachable function keeps the last good copy or the example.
import 'server-only'
import type { BlogConfig } from '../data/blogConfig.ts'
import defaults from '../data/blog-config.example.json'
import { BLOG_CONFIG_FILE } from '../data/configFiles.ts'
import { isObject, withDefaults, type Json } from '../lib/jsonDefaults.ts'
import { sanitizeBlogConfig } from '../lib/blogConfigSanitize.ts'
import { configLoader } from './configService.ts'

const example = defaults as unknown as BlogConfig

function parse(content: string): BlogConfig {
  const stored: unknown = JSON.parse(content)
  const merged = withDefaults(defaults as Json, isObject(stored) ? stored : {})
  return sanitizeBlogConfig(merged, example, (message) => console.warn(message))
}

export const getBlogConfig = configLoader<BlogConfig>({
  file: BLOG_CONFIG_FILE,
  parse,
  fallback: () => example,
})
