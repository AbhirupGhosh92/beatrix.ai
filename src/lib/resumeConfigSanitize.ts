// Turns a stored (admin-editable) resume config into one the builder can trust: bad limits,
// rules or structure fall back to the example's, and invalid templates are dropped, so a typo in
// the CMS never breaks the page.
import {
  TEMPLATE_FONTS,
  TEMPLATE_LAYOUTS,
  TEMPLATE_SPACINGS,
  type ResumeConfig,
  type ResumeTemplate,
} from '../data/resumeConfig.ts'
import { isObject, type Json } from './jsonDefaults.ts'
import { FIELD_TYPES, validateStructure, type FieldType, type StructureRules, type Structure } from './resumeValidation.ts'

const COLOR = /^#[0-9a-fA-F]{6}$/
const RULE_NUMBERS = [
  'maxSections',
  'maxFieldsPerSection',
  'maxEntries',
  'maxLabelLength',
  'maxShortLength',
  'maxTextLength',
  'maxBullets',
  'maxBulletLength',
  'maxResumeChars',
] as const

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max

function validRules(value: unknown): value is StructureRules {
  if (!isObject(value)) return false
  if (!Array.isArray(value.fieldTypes) || value.fieldTypes.length === 0) return false
  if (!value.fieldTypes.every((t) => FIELD_TYPES.includes(t as FieldType))) return false
  return RULE_NUMBERS.every((key) => isInt(value[key], 1, 1_000_000))
}

export function validTemplate(value: unknown): value is ResumeTemplate {
  if (!isObject(value) || !isObject(value.style)) return false
  const { style } = value
  return (
    typeof value.id === 'string' &&
    /^[a-z][a-z0-9_-]{0,31}$/.test(value.id) &&
    typeof value.label === 'string' &&
    value.label.trim() !== '' &&
    value.label.length <= 60 &&
    typeof value.enabled === 'boolean' &&
    (TEMPLATE_LAYOUTS as readonly unknown[]).includes(value.layout) &&
    (TEMPLATE_FONTS as readonly unknown[]).includes(style.font) &&
    isInt(style.baseSize, 8, 14) &&
    typeof style.accent === 'string' &&
    COLOR.test(style.accent) &&
    (TEMPLATE_SPACINGS as readonly unknown[]).includes(style.spacing)
  )
}

/** `merged` is the stored file already merged over the example; `fallback` is the example. */
export function sanitizeResumeConfig(merged: Json, fallback: ResumeConfig, warn: (message: string) => void = () => {}): ResumeConfig {
  const rules = validRules(merged.structureRules) ? merged.structureRules : fallback.structureRules
  if (rules === fallback.structureRules && merged.structureRules !== fallback.structureRules) warn('resume-config: invalid structureRules, using the example.')

  const problems = validateStructure(merged.defaultStructure, rules)
  let structure = merged.defaultStructure as Structure
  if (problems.length > 0) {
    warn(`resume-config: invalid defaultStructure (${problems[0]}), using the example.`)
    structure = fallback.defaultStructure
  }

  const limits = isObject(merged.limits) && isInt(merged.limits.baseMaxResumes, 1, 1000) ? merged.limits.baseMaxResumes : fallback.limits.baseMaxResumes

  const seen = new Set<string>()
  const templates: ResumeTemplate[] = []
  const stored = Array.isArray(merged.templates) ? merged.templates : []
  for (const template of stored) {
    if (!validTemplate(template) || seen.has(template.id)) {
      warn(`resume-config: skipped an invalid or duplicate template.`)
      continue
    }
    seen.add(template.id)
    templates.push(template)
  }

  return { limits: { baseMaxResumes: limits }, structureRules: rules, defaultStructure: structure, templates }
}
