// Landing page config, read server-side from the `getConfig` Cloud Function (Firebase Storage,
// cms/home-config.json). Missing keys come from the committed example, bad values are replaced by
// sanitizeHomeConfig, and an unreachable function keeps the last good copy or the example, so the
// landing page always renders.
import 'server-only'
import type { HomeConfig } from '../data/homeConfig.ts'
import defaults from '../data/home-config.example.json'
import { isObject, withDefaults, type Json } from '../lib/jsonDefaults.ts'
import { sanitizeHomeConfig } from '../lib/homeConfigSanitize.ts'
import { HOME_CONFIG_FILE } from '../data/configFiles.ts'
import { configLoader } from './configService.ts'

const example = defaults as unknown as HomeConfig

function parse(content: string): HomeConfig {
  const stored: unknown = JSON.parse(content)
  const merged = withDefaults(defaults as Json, isObject(stored) ? stored : {})
  return sanitizeHomeConfig(merged, example, (message) => console.warn(message))
}

export const getHomeConfig = configLoader<HomeConfig>({
  file: HOME_CONFIG_FILE,
  parse,
  fallback: () => example,
})
