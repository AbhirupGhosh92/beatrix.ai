// The format-independent resume: structure + data become a header and sections of simple blocks
// that the Markdown, DOCX and PDF renderers all consume, so the content cannot differ per format.
//
// A structure can be custom, so nothing here knows section names; it reads field types and order:
//  - a non-repeatable first section is the header: its first text field is the name, its second
//    the headline, and the other text, email, url and phone fields form the contact line;
//  - in a repeatable section a field of type text/email/url/phone gives, in order, the entry's
//    primary line, secondary line and details, month fields give the dates, and
//    textarea/bullets fields give the paragraph and the bullet points;
//  - a non-repeatable section whose only field is a bullets field is a compact inline list.
// Blank values and completely empty entries are left out.
import {
  activeVariant,
  entriesOf,
  isBlank,
  type FieldDef,
  type FieldType,
  type ResumeData,
  type ResumeView,
  type SectionData,
  type SectionDef,
  type Structure,
} from '../resumeValidation.ts'
import { orderSections } from './view.ts'

export type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'inline-list'; items: string[] }
  | { kind: 'labelled'; label: string; value: string }
  | { kind: 'entry'; primary: string; secondary: string; details: string; dates: string; blocks: Block[] }

export interface DocSection {
  title: string
  blocks: Block[]
  /** Short, paragraph-free sections that the sidebar layout may move aside. */
  compact: boolean
}

export interface ResumeDocument {
  name: string
  headline: string
  contact: string[]
  sections: DocSection[]
}

const LINE_TYPES: readonly FieldType[] = ['text', 'email', 'url', 'phone']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const isLine = (field: FieldDef) => LINE_TYPES.includes(field.type)

function text(entry: SectionData, field: FieldDef): string {
  const value = entry[field.id]
  return typeof value === 'string' ? value.trim() : ''
}

function items(entry: SectionData, field: FieldDef): string[] {
  const value = entry[field.id]
  return Array.isArray(value) ? value.map((item) => item.trim()).filter((item) => item !== '') : []
}

/** `2021-03` -> `Mar 2021`; anything else is returned as is. */
export function formatMonth(value: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value)
  return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : value
}

function entryBlocks(section: SectionDef, entry: SectionData): Block[] {
  const blocks: Block[] = []
  for (const field of section.fields) {
    if (field.type === 'textarea' && text(entry, field)) blocks.push({ kind: 'paragraph', text: text(entry, field) })
    if (field.type === 'bullets' && items(entry, field).length) blocks.push({ kind: 'bullets', items: items(entry, field) })
  }
  return blocks
}

function buildEntry(section: SectionDef, entry: SectionData): Block {
  const lines = section.fields.filter(isLine).map((field) => text(entry, field)).filter((value) => value !== '')
  const monthFields = section.fields.filter((field) => field.type === 'month')
  const [start = '', end = ''] = monthFields.map((field) => text(entry, field))
  let dates = ''
  if (start && end) dates = `${formatMonth(start)} - ${formatMonth(end)}`
  else if (start) dates = monthFields.length > 1 ? `${formatMonth(start)} - Present` : formatMonth(start)
  else if (end) dates = formatMonth(end)

  return {
    kind: 'entry',
    primary: lines[0] ?? '',
    secondary: lines[1] ?? '',
    details: lines.slice(2).join(' | '),
    dates,
    blocks: entryBlocks(section, entry),
  }
}

function plainBlocks(section: SectionDef, entry: SectionData): Block[] {
  const only = section.fields.length === 1 ? section.fields[0] : undefined
  const blocks: Block[] = []
  for (const field of section.fields) {
    if (field.type === 'textarea') {
      if (text(entry, field)) blocks.push({ kind: 'paragraph', text: text(entry, field) })
    } else if (field.type === 'bullets') {
      const list = items(entry, field)
      if (list.length) blocks.push({ kind: only === field ? 'inline-list' : 'bullets', items: list })
    } else if (text(entry, field)) {
      const value = field.type === 'month' ? formatMonth(text(entry, field)) : text(entry, field)
      blocks.push({ kind: 'labelled', label: field.label, value })
    }
  }
  return blocks
}

// The first section of the structure is the header and stays on top; the view orders the rest, and
// a `variants` section contributes only its active entry.
export function buildDocument(title: string, structure: Structure, data: ResumeData, view?: ResumeView | null): ResumeDocument {
  const doc: ResumeDocument = { name: title, headline: '', contact: [], sections: [] }
  const [first, ...rest] = structure.sections
  const sectionsToRender = orderSections(rest, view)

  if (first && !first.repeatable) {
    const entry = (Array.isArray(data[first.id]) || !data[first.id] ? {} : data[first.id]) as SectionData
    const lineFields = first.fields.filter(isLine)
    const [nameField, headlineField] = lineFields.filter((field) => field.type === 'text')
    if (nameField && text(entry, nameField)) doc.name = text(entry, nameField)
    if (headlineField) doc.headline = text(entry, headlineField)
    doc.contact = lineFields
      .filter((field) => field !== nameField && field !== headlineField)
      .map((field) => text(entry, field))
      .filter((value) => value !== '')
    // Header-section fields that are not lines (a bio, skills, dates) become a normal section.
    const other = { ...first, fields: first.fields.filter((field) => !isLine(field)) }
    if (other.fields.length > 0) sectionsToRender.unshift(other)
  } else if (first) {
    sectionsToRender.unshift(first)
  }

  for (const section of sectionsToRender) {
    const value = data[section.id]
    let blocks: Block[]
    if (section.repeatable) {
      const all = entriesOf(section, value)
      const entries = section.variants ? all.filter((_, index) => index === activeVariant(section, data, view)) : all
      const filled = entries.filter((entry) => !isBlank(Object.values(entry)))
      // A variant is prose (a summary), not a job-like entry, so it prints as plain blocks.
      blocks = section.variants ? filled.flatMap((entry) => plainBlocks(section, entry)) : filled.map((entry) => buildEntry(section, entry))
    } else {
      blocks = Array.isArray(value) || !value ? [] : plainBlocks(section, value)
    }
    if (blocks.length === 0) continue
    doc.sections.push({
      title: section.title,
      blocks,
      compact: (!section.repeatable || section.variants === true) && blocks.every((block) => block.kind !== 'paragraph'),
    })
  }
  return doc
}

/** Characters outside what the PDF standard fonts (Windows-1252) can show, without duplicates. */
export function pdfUnsupportedChars(doc: ResumeDocument): string[] {
  const all: string[] = [doc.name, doc.headline, ...doc.contact]
  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.kind === 'paragraph') all.push(block.text)
      else if (block.kind === 'bullets' || block.kind === 'inline-list') all.push(...block.items)
      else if (block.kind === 'labelled') all.push(block.label, block.value)
      else {
        all.push(block.primary, block.secondary, block.details, block.dates)
        walk(block.blocks)
      }
    }
  }
  for (const section of doc.sections) {
    all.push(section.title)
    walk(section.blocks)
  }
  const bad = new Set<string>()
  for (const ch of all.join('')) if (!isPdfSafe(ch)) bad.add(ch)
  return [...bad]
}

const CP1252_EXTRA = '\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178'

export function isPdfSafe(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0
  return code === 0x0a || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || CP1252_EXTRA.includes(ch)
}
