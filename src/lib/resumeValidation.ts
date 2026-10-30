// Resume structure and data validation, shared by the form (live checks), the exporter and the
// Cloud Functions (which check again before storing). Pure and import-free so that
// functions/src/resumeValidation.ts, a separate package, can be a byte-identical copy; edit both
// together (`diff src/lib/resumeValidation.ts functions/src/resumeValidation.ts` must be empty).

export type FieldType = 'text' | 'textarea' | 'email' | 'url' | 'phone' | 'month' | 'bullets'

export interface FieldDef {
  id: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  maxLength?: number
}

export interface SectionDef {
  id: string
  title: string
  /** A list of entries (jobs, schools, ...) instead of a single set of fields. */
  repeatable?: boolean
  fields: FieldDef[]
}

export interface Structure {
  sections: SectionDef[]
}

/** The limits a structure and a resume must stay within; they come from the resume config. */
export interface StructureRules {
  fieldTypes: FieldType[]
  maxSections: number
  maxFieldsPerSection: number
  /** Entries in one repeatable section. */
  maxEntries: number
  maxLabelLength: number
  /** Single-line fields (text, email, url, phone). */
  maxShortLength: number
  /** Multi-line text fields. */
  maxTextLength: number
  maxBullets: number
  maxBulletLength: number
  /** Whole resume data, measured as the length of its JSON text. */
  maxResumeChars: number
}

export type FieldValue = string | string[]
export type SectionData = Record<string, FieldValue>
export type ResumeData = Record<string, SectionData | SectionData[]>

export interface FieldIssue {
  /** `section.field` or `section.<index>.field` for entries of a repeatable section. */
  path: string
  message: string
}

export const FIELD_TYPES: readonly FieldType[] = ['text', 'textarea', 'email', 'url', 'phone', 'month', 'bullets']

const ID = /^[a-z][a-z0-9_]{0,31}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s().-]{5,25}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const MAX_ERRORS = 20

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unknownKeys(obj: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(obj).filter((key) => !allowed.includes(key))
}

/** The longest value a field of this type may hold under `rules`. */
export function typeCap(type: FieldType, rules: StructureRules): number {
  switch (type) {
    case 'textarea':
      return rules.maxTextLength
    case 'month':
      return 7
    case 'bullets':
      return rules.maxBulletLength
    default:
      return rules.maxShortLength
  }
}

function effectiveMax(field: FieldDef, rules: StructureRules): number {
  return Math.min(field.maxLength ?? Infinity, typeCap(field.type, rules))
}

/** Problems with a structure file, empty when it is acceptable. */
export function validateStructure(value: unknown, rules: StructureRules): string[] {
  const errors: string[] = []
  const add = (message: string) => {
    if (errors.length < MAX_ERRORS) errors.push(message)
  }

  if (!isObject(value)) return ['The structure must be an object.']
  for (const key of unknownKeys(value, ['sections'])) add(`Unknown key "${key}".`)

  const sections = value.sections
  if (!Array.isArray(sections) || sections.length === 0) return [...errors, 'The structure needs at least one section.']
  if (sections.length > rules.maxSections) add(`At most ${rules.maxSections} sections are allowed.`)

  const sectionIds = new Set<string>()
  sections.slice(0, rules.maxSections).forEach((section: unknown, s) => {
    const at = `sections[${s}]`
    if (!isObject(section)) return add(`${at} must be an object.`)
    for (const key of unknownKeys(section, ['id', 'title', 'repeatable', 'fields'])) add(`${at}: unknown key "${key}".`)

    if (typeof section.id !== 'string' || !ID.test(section.id)) add(`${at}: id must be lowercase letters, digits or _ (start with a letter).`)
    else if (sectionIds.has(section.id)) add(`${at}: duplicate id "${section.id}".`)
    else sectionIds.add(section.id)

    if (typeof section.title !== 'string' || section.title.trim() === '' || section.title.length > rules.maxLabelLength) {
      add(`${at}: title must be 1-${rules.maxLabelLength} characters.`)
    }
    if (section.repeatable !== undefined && typeof section.repeatable !== 'boolean') add(`${at}: repeatable must be true or false.`)

    const fields = section.fields
    if (!Array.isArray(fields) || fields.length === 0) return add(`${at}: needs at least one field.`)
    if (fields.length > rules.maxFieldsPerSection) add(`${at}: at most ${rules.maxFieldsPerSection} fields are allowed.`)

    const fieldIds = new Set<string>()
    fields.slice(0, rules.maxFieldsPerSection).forEach((field: unknown, f) => {
      const fat = `${at}.fields[${f}]`
      if (!isObject(field)) return add(`${fat} must be an object.`)
      for (const key of unknownKeys(field, ['id', 'label', 'type', 'required', 'placeholder', 'maxLength'])) {
        add(`${fat}: unknown key "${key}".`)
      }
      if (typeof field.id !== 'string' || !ID.test(field.id)) add(`${fat}: id must be lowercase letters, digits or _ (start with a letter).`)
      else if (fieldIds.has(field.id)) add(`${fat}: duplicate id "${field.id}".`)
      else fieldIds.add(field.id)

      if (typeof field.label !== 'string' || field.label.trim() === '' || field.label.length > rules.maxLabelLength) {
        add(`${fat}: label must be 1-${rules.maxLabelLength} characters.`)
      }
      const type = field.type
      if (typeof type !== 'string' || !rules.fieldTypes.includes(type as FieldType)) {
        add(`${fat}: type must be one of ${rules.fieldTypes.join(', ')}.`)
      }
      if (field.required !== undefined && typeof field.required !== 'boolean') add(`${fat}: required must be true or false.`)
      if (field.placeholder !== undefined && (typeof field.placeholder !== 'string' || field.placeholder.length > rules.maxShortLength)) {
        add(`${fat}: placeholder must be text up to ${rules.maxShortLength} characters.`)
      }
      if (field.maxLength !== undefined) {
        const cap = typeof type === 'string' && FIELD_TYPES.includes(type as FieldType) ? typeCap(type as FieldType, rules) : rules.maxTextLength
        if (!Number.isInteger(field.maxLength) || (field.maxLength as number) < 1 || (field.maxLength as number) > cap) {
          add(`${fat}: maxLength must be a whole number from 1 to ${cap}.`)
        }
      }
    })
  })
  return errors
}

/** An empty value for a field type. */
export function blankValue(type: FieldType): FieldValue {
  return type === 'bullets' ? [] : ''
}

export function blankEntry(section: SectionDef): SectionData {
  const entry: SectionData = {}
  for (const field of section.fields) entry[field.id] = blankValue(field.type)
  return entry
}

/** A fresh resume: every field empty, repeatable sections start with one blank entry. */
export function emptyData(structure: Structure): ResumeData {
  const data: ResumeData = {}
  for (const section of structure.sections) {
    data[section.id] = section.repeatable ? [blankEntry(section)] : blankEntry(section)
  }
  return data
}

export function isBlank(value: unknown): boolean {
  if (Array.isArray(value)) return value.every((item) => isBlank(item))
  return typeof value !== 'string' || value.trim() === ''
}

function isBlankEntry(entry: unknown): boolean {
  return !isObject(entry) || Object.values(entry).every((value) => isBlank(value))
}

/** The problem with one field's value, or null. Used for live checks and before generating. */
export function validateField(field: FieldDef, value: unknown, rules: StructureRules): string | null {
  if (isBlank(value)) return field.required ? 'This field is required.' : null
  const max = effectiveMax(field, rules)

  if (field.type === 'bullets') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return 'Enter a list of text lines.'
    const items = value.filter((item) => item.trim() !== '')
    if (items.length > rules.maxBullets) return `At most ${rules.maxBullets} lines.`
    if (items.some((item) => item.length > max)) return `Each line is at most ${max} characters.`
    return null
  }

  if (typeof value !== 'string') return 'Enter text.'
  const text = value.trim()
  if (text.length > max) return `At most ${max} characters.`
  if (field.type === 'email' && !EMAIL.test(text)) return 'Enter a valid email address.'
  if (field.type === 'phone' && !PHONE.test(text)) return 'Enter a valid phone number.'
  if (field.type === 'month' && !MONTH.test(text)) return 'Use the format YYYY-MM.'
  if (field.type === 'url') {
    try {
      const url = new URL(text)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Enter a link starting with http:// or https://.'
    } catch {
      return 'Enter a valid link, for example https://example.com.'
    }
  }
  return null
}

/**
 * Everything wrong with `data` for generating a file. Entries of a repeatable section that are
 * completely empty are ignored, so a user without (say) work experience is not blocked.
 */
export function validateForGenerate(structure: Structure, data: ResumeData, rules: StructureRules): FieldIssue[] {
  const issues: FieldIssue[] = []
  for (const section of structure.sections) {
    const value = data[section.id]
    const entries = section.repeatable ? (Array.isArray(value) ? value : []) : [value]
    entries.forEach((entry, index) => {
      if (section.repeatable && isBlankEntry(entry)) return
      const values = isObject(entry) ? entry : {}
      for (const field of section.fields) {
        const message = validateField(field, values[field.id], rules)
        if (message) {
          issues.push({ path: section.repeatable ? `${section.id}.${index}.${field.id}` : `${section.id}.${field.id}`, message })
        }
      }
    })
  }
  return issues
}

/**
 * The shape and size problems that stop a draft from being stored (unknown sections or fields,
 * wrong value types, values over their limits). Empty or invalid-but-well-formed content passes:
 * drafts always save, and full validation only gates generating.
 */
export function checkDraft(structure: Structure, data: unknown, rules: StructureRules): string[] {
  const errors: string[] = []
  const add = (message: string) => {
    if (errors.length < MAX_ERRORS) errors.push(message)
  }
  if (!isObject(data)) return ['The resume data must be an object.']
  if (JSON.stringify(data).length > rules.maxResumeChars) add(`The resume is larger than ${rules.maxResumeChars} characters.`)

  const known = structure.sections.map((section) => section.id)
  for (const key of unknownKeys(data, known)) add(`Unknown section "${key}".`)

  for (const section of structure.sections) {
    const value = data[section.id]
    if (value === undefined) continue
    let entries: unknown[]
    if (section.repeatable) {
      if (!Array.isArray(value)) {
        add(`${section.id}: must be a list of entries.`)
        continue
      }
      if (value.length > rules.maxEntries) add(`${section.id}: at most ${rules.maxEntries} entries.`)
      entries = value.slice(0, rules.maxEntries)
    } else {
      entries = [value]
    }

    entries.forEach((entry) => {
      if (!isObject(entry)) return add(`${section.id}: entries must be objects.`)
      const ids = section.fields.map((field) => field.id)
      for (const key of unknownKeys(entry, ids)) add(`${section.id}: unknown field "${key}".`)
      for (const field of section.fields) {
        const fieldValue = entry[field.id]
        if (fieldValue === undefined) continue
        const max = effectiveMax(field, rules)
        if (field.type === 'bullets') {
          if (!Array.isArray(fieldValue) || fieldValue.some((item) => typeof item !== 'string')) add(`${section.id}.${field.id}: must be a list of text lines.`)
          else if (fieldValue.length > rules.maxBullets) add(`${section.id}.${field.id}: at most ${rules.maxBullets} lines.`)
          else if (fieldValue.some((item) => item.length > max)) add(`${section.id}.${field.id}: a line is longer than ${max} characters.`)
        } else if (typeof fieldValue !== 'string') add(`${section.id}.${field.id}: must be text.`)
        else if (fieldValue.length > max) add(`${section.id}.${field.id}: longer than ${max} characters.`)
      }
    })
  }
  return errors
}
