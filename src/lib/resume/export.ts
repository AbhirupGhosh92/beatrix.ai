// Turns the open resume into one downloadable file. The PDF and DOCX libraries are large, so they
// are imported only when the user presses Generate, and never on the landing page.
import type { ResumeTemplate } from '../../data/resumeConfig.ts'
import type { ResumeData, Structure } from '../resumeValidation.ts'
import { buildDocument, pdfUnsupportedChars } from './model.ts'
import { slug } from './style.ts'

export const FORMATS = [
  { id: 'pdf', label: 'PDF', extension: 'pdf' },
  { id: 'docx', label: 'Word (DOCX)', extension: 'docx' },
  { id: 'md', label: 'Markdown', extension: 'md' },
] as const
export type ExportFormat = (typeof FORMATS)[number]['id']

export interface ExportInput {
  title: string
  structure: Structure
  data: ResumeData
  format: ExportFormat
  /** Required for PDF and DOCX; Markdown has no styling. */
  template?: ResumeTemplate
}

export interface ExportResult {
  blob: Blob
  filename: string
  /** Things the user should know about, e.g. characters the PDF cannot show. */
  warnings: string[]
}

export async function exportResume({ title, structure, data, format, template }: ExportInput): Promise<ExportResult> {
  const doc = buildDocument(title, structure, data)
  const base = slug(doc.name)

  if (format === 'md') {
    const { toMarkdown } = await import('./markdown.ts')
    return { blob: new Blob([toMarkdown(doc)], { type: 'text/markdown;charset=utf-8' }), filename: `${base}.md`, warnings: [] }
  }
  if (!template) throw new Error('Choose a template first.')
  const filename = `${base}-${template.id}.${format}`

  if (format === 'docx') {
    const { toDocx } = await import('./toDocx.ts')
    return { blob: await toDocx(doc, template), filename, warnings: [] }
  }

  const { toPdf } = await import('./toPdf.ts')
  const unsupported = pdfUnsupportedChars(doc)
  const warnings =
    unsupported.length > 0
      ? [`The PDF cannot show these characters and prints "?" instead: ${unsupported.slice(0, 8).join(' ')}. Use Word (DOCX) or Markdown to keep them.`]
      : []
  return { blob: await toPdf(doc, template), filename, warnings }
}

/** Starts a browser download of `blob`. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
