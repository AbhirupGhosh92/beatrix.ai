// Pure helpers for editing resume data in the form: fitting stored data to a structure and
// immutable updates. Validation itself lives in resumeValidation.ts.
import {
  blankEntry,
  blankValue,
  type FieldDef,
  type FieldValue,
  type ResumeData,
  type SectionData,
  type SectionDef,
  type Structure,
} from './resumeValidation.ts'

function coerce(field: FieldDef, value: unknown): FieldValue {
  if (field.type === 'bullets') {
    return Array.isArray(value) && value.every((item) => typeof item === 'string') ? (value as string[]) : []
  }
  return typeof value === 'string' ? value : blankValue(field.type)
}

function reconcileEntry(section: SectionDef, entry: unknown): SectionData {
  const source = typeof entry === 'object' && entry !== null && !Array.isArray(entry) ? (entry as Record<string, unknown>) : {}
  const out: SectionData = {}
  for (const field of section.fields) out[field.id] = coerce(field, source[field.id])
  return out
}

/**
 * Fits stored data to a structure: unknown sections and fields are dropped, missing ones become
 * blank, values of the wrong type are blanked, and a repeatable section has at least one entry.
 * Values of fields that survive a structure edit are kept.
 */
export function reconcileData(structure: Structure, data: unknown): ResumeData {
  const source = typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  const out: ResumeData = {}
  for (const section of structure.sections) {
    const value = source[section.id]
    if (section.repeatable) {
      const entries = Array.isArray(value) ? value.map((entry) => reconcileEntry(section, entry)) : []
      out[section.id] = entries.length > 0 ? entries : [blankEntry(section)]
    } else {
      out[section.id] = reconcileEntry(section, value)
    }
  }
  return out
}

export function setFieldValue(data: ResumeData, section: SectionDef, index: number, fieldId: string, value: FieldValue): ResumeData {
  const current = data[section.id]
  if (section.repeatable) {
    const entries = Array.isArray(current) ? [...current] : []
    entries[index] = { ...(entries[index] ?? blankEntry(section)), [fieldId]: value }
    return { ...data, [section.id]: entries }
  }
  const entry = Array.isArray(current) || !current ? blankEntry(section) : current
  return { ...data, [section.id]: { ...entry, [fieldId]: value } }
}

export function addEntry(data: ResumeData, section: SectionDef): ResumeData {
  const current = data[section.id]
  const entries = Array.isArray(current) ? current : []
  return { ...data, [section.id]: [...entries, blankEntry(section)] }
}

export function removeEntry(data: ResumeData, section: SectionDef, index: number): ResumeData {
  const current = data[section.id]
  const entries = Array.isArray(current) ? current.filter((_, i) => i !== index) : []
  return { ...data, [section.id]: entries.length > 0 ? entries : [blankEntry(section)] }
}

/** The path validateForGenerate() reports for a field. */
export const fieldPath = (section: SectionDef, index: number, fieldId: string) =>
  section.repeatable ? `${section.id}.${index}.${fieldId}` : `${section.id}.${fieldId}`
