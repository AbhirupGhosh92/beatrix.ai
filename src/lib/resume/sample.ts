// Sample content for template previews, built from the structure so it fits custom structures
// too. It never touches the user's own resume. The example text of a field (its placeholder
// without the leading "e.g.") is reused when there is one, so the default structure previews as a
// believable resume.
import {
  blankEntry,
  type FieldDef,
  type FieldValue,
  type ResumeData,
  type SectionData,
  type SectionDef,
  type Structure,
} from '../resumeValidation.ts'

const exampleOf = (field: FieldDef) => field.placeholder?.replace(/^e\.g\.\s*/i, '').trim() || undefined

function sampleBullets(field: FieldDef): string[] {
  const example = exampleOf(field)
  // "TypeScript, React, SQL" is a list already; a sentence gets a second sample line.
  const parts = example?.split(/,\s*/) ?? []
  if (parts.length >= 3 && parts.every((part) => part.length < 30)) return parts
  return [example ?? 'Sample point about what you did', 'Another sample point with a result']
}

function sampleValue(field: FieldDef, month: number, entry: number): FieldValue {
  switch (field.type) {
    case 'email':
      return 'name@example.com'
    case 'phone':
      return '+1 555 010 0199'
    case 'url':
      return 'https://example.com'
    case 'month':
      // First month field is a start, the second an end; the newest entry is still current.
      return month === 0 ? `${2022 - 3 * entry}-03` : entry === 0 ? '' : `${2022 - 3 * entry + 2}-12`
    case 'textarea':
      return exampleOf(field) ?? 'A short sample paragraph that shows how longer text looks in this template.'
    case 'bullets':
      return sampleBullets(field)
    default:
      return exampleOf(field) ?? `Sample ${field.label.toLowerCase()}`
  }
}

function sampleEntry(section: SectionDef, entry: number): SectionData {
  const out = blankEntry(section)
  let month = 0
  for (const field of section.fields) {
    out[field.id] = sampleValue(field, month, entry)
    if (field.type === 'month') month += 1
  }
  return out
}

/** Sample data for `structure`: repeatable sections get two entries. */
export function sampleData(structure: Structure): ResumeData {
  const data: ResumeData = {}
  for (const section of structure.sections) {
    data[section.id] = section.repeatable ? [sampleEntry(section, 0), sampleEntry(section, 1)] : sampleEntry(section, 0)
  }
  return data
}
