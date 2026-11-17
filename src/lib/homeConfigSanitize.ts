// A CMS typo must never break the landing page: every text key of the home config has to be a string,
// the feature and step lists must be valid, and anything else is replaced by the example's value.
import { HOME_ICONS, HOME_LIMITS } from '../data/homeConfig.ts'
import type { FeatureItem, HomeConfig, StepItem } from '../data/homeConfig.ts'
import { isObject } from './jsonDefaults.ts'

type Warn = ((message: string) => void) | undefined

/** `aboutHref` must be a path on this site (starts with a single slash). */
function validPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//')
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= max
}

function validIcon(value: unknown): boolean {
  return typeof value === 'string' && (HOME_ICONS as readonly string[]).includes(value)
}

function validFeature(item: unknown): item is FeatureItem {
  if (!isObject(item)) return false
  return (
    text(item.id, HOME_LIMITS.titleMax) &&
    text(item.title, HOME_LIMITS.titleMax) &&
    text(item.description, HOME_LIMITS.descriptionMax) &&
    validIcon(item.icon) &&
    (item.preview === undefined || typeof item.preview === 'boolean')
  )
}

function validStep(item: unknown): item is StepItem {
  if (!isObject(item)) return false
  return text(item.title, HOME_LIMITS.titleMax) && text(item.description, HOME_LIMITS.descriptionMax) && validIcon(item.icon)
}

function validFeatureList(list: unknown): list is FeatureItem[] {
  if (!Array.isArray(list)) return false
  if (list.length < HOME_LIMITS.featuresMin || list.length > HOME_LIMITS.featuresMax) return false
  if (!list.every(validFeature)) return false
  return new Set(list.map((item) => item.id)).size === list.length
}

function validStepList(list: unknown): list is StepItem[] {
  if (!Array.isArray(list)) return false
  if (list.length < HOME_LIMITS.stepsMin || list.length > HOME_LIMITS.stepsMax) return false
  return list.every(validStep)
}

function sanitizeHeading(value: unknown, fallback: string, label: string, warn: Warn): string {
  if (value === undefined) return fallback
  if (!text(value, HOME_LIMITS.headingMax)) {
    warn?.(`home-config.json: "${label}" must be short text, using the example value.`)
    return fallback
  }
  return value
}

export function sanitizeHomeConfig(value: unknown, example: HomeConfig, warn?: Warn): HomeConfig {
  const source = isObject(value) ? value : {}
  const out = { ...example } as unknown as Record<string, unknown>
  const structured = ['features', 'howItWorks', 'closing']
  for (const key of Object.keys(example) as (keyof HomeConfig)[]) {
    if (structured.includes(key)) continue
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

  const features = isObject(source.features) ? source.features : {}
  const items = features.items
  const itemsOk = validFeatureList(items)
  if (items !== undefined && !itemsOk) warn?.('home-config.json: "features.items" is not a valid list, using the example list.')
  out.features = {
    heading: sanitizeHeading(features.heading, example.features.heading, 'features.heading', warn),
    intro: sanitizeHeading(features.intro, example.features.intro, 'features.intro', warn),
    items: itemsOk ? items : example.features.items,
  }

  const how = isObject(source.howItWorks) ? source.howItWorks : {}
  const steps = how.steps
  const stepsOk = validStepList(steps)
  if (steps !== undefined && !stepsOk) warn?.('home-config.json: "howItWorks.steps" is not a valid list, using the example list.')
  out.howItWorks = {
    heading: sanitizeHeading(how.heading, example.howItWorks.heading, 'howItWorks.heading', warn),
    intro: sanitizeHeading(how.intro, example.howItWorks.intro, 'howItWorks.intro', warn),
    steps: stepsOk ? steps : example.howItWorks.steps,
  }

  const closing = isObject(source.closing) ? source.closing : {}
  out.closing = {
    title: sanitizeHeading(closing.title, example.closing.title, 'closing.title', warn),
    message: sanitizeHeading(closing.message, example.closing.message, 'closing.message', warn),
  }
  return out as unknown as HomeConfig
}
