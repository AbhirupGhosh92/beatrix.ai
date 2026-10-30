// How a template's style tokens map to concrete values, shared by the PDF and DOCX renderers.
// The fonts are the PDF standard fonts and the Word default fonts that look alike, so a DOCX that
// is converted to PDF keeps its layout.
import type { TemplateFont, TemplateSpacing } from '../../data/resumeConfig.ts'

export const PDF_FONTS: Record<TemplateFont, { regular: string; bold: string; italic: string }> = {
  sans: { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' },
  serif: { regular: 'Times-Roman', bold: 'Times-Bold', italic: 'Times-Italic' },
  mono: { regular: 'Courier', bold: 'Courier-Bold', italic: 'Courier-Oblique' },
}

export const DOCX_FONTS: Record<TemplateFont, string> = {
  sans: 'Arial',
  serif: 'Times New Roman',
  mono: 'Courier New',
}

/** Vertical rhythm in points, plus the line height as a multiple of the font size. */
export const SPACING: Record<TemplateSpacing, { section: number; entry: number; line: number }> = {
  compact: { section: 8, entry: 4, line: 1.15 },
  normal: { section: 12, entry: 6, line: 1.3 },
  relaxed: { section: 16, entry: 9, line: 1.45 },
}

/** `#rrggbb` -> `rrggbb` (Word wants no hash). */
export const bare = (hex: string) => hex.replace('#', '')

/** A light version of `hex` (mixed toward white), for the sidebar background. */
export function tint(hex: string, amount = 0.88): string {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16)
    return Math.round(value + (255 - value) * amount).toString(16).padStart(2, '0')
  }
  return `#${channel(1)}${channel(3)}${channel(5)}`
}

/** Filename-safe version of a resume name. */
export function slug(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return cleaned || 'resume'
}
