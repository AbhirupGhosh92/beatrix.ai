// Resume builder config, read server-side from the `getConfig` Cloud Function (Firebase
// Storage, cms/resume-config.json). Missing keys come from the committed example, bad values are
// replaced or dropped by sanitizeResumeConfig, and an unreachable function keeps the last good
// copy or the example, so the builder never breaks over config.
import 'server-only'
import type { ResumeConfig } from '../data/resumeConfig.ts'
import defaults from '../data/resume-config.example.json'
import { isObject, withDefaults, type Json } from '../lib/jsonDefaults.ts'
import { sanitizeResumeConfig } from '../lib/resumeConfigSanitize.ts'
import { RESUME_CONFIG_FILE } from '../data/configFiles.ts'
import { configLoader } from './configService.ts'

const example = defaults as unknown as ResumeConfig

function parse(content: string): ResumeConfig {
  const stored: unknown = JSON.parse(content)
  const merged = withDefaults(defaults as Json, isObject(stored) ? stored : {})
  return sanitizeResumeConfig(merged, example, (message) => console.warn(message))
}

export const getResumeConfig = configLoader<ResumeConfig>({
  file: RESUME_CONFIG_FILE,
  parse,
  fallback: () => sanitizeResumeConfig(defaults as Json, example),
})
