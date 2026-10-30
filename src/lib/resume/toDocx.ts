// DOCX output. Built for accuracy over looks, so a user can open it in Word and save a PDF from
// it: real Title / Heading 1 / Heading 2 styles, real bullet lists, selectable text, dates aligned
// with a tab stop instead of a table, and only fonts that Word has. Both layouts render as one column.
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx'
import type { ResumeTemplate } from '../../data/resumeConfig.ts'
import type { Block, ResumeDocument } from './model.ts'
import { DOCX_FONTS, SPACING, bare } from './style.ts'

const BULLETS = 'resume-bullets'
const PAGE_WIDTH = 11906 // A4 in twips
const PAGE_MARGIN = 1000 // twips, about 1.75 cm
const TEXT_WIDTH = PAGE_WIDTH - 2 * PAGE_MARGIN
const GREY = '555555'

const half = (pt: number) => Math.round(pt * 2)
const twip = (pt: number) => Math.round(pt * 20)

/** Text with its line breaks kept. */
function runs(value: string, options: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}): TextRun[] {
  return value.split('\n').map((line, index) => new TextRun({ text: line, break: index > 0 ? 1 : undefined, ...options }))
}

export async function toDocx(doc: ResumeDocument, template: ResumeTemplate): Promise<Blob> {
  const { font, baseSize, accent, spacing } = template.style
  const space = SPACING[spacing]
  const accentColor = bare(accent)
  const fontName = DOCX_FONTS[font]

  const bullet = (text: string) =>
    new Paragraph({ children: runs(text), numbering: { reference: BULLETS, level: 0 }, spacing: { after: twip(1) } })

  const block = (item: Block): Paragraph[] => {
    switch (item.kind) {
      case 'paragraph':
        return [new Paragraph({ children: runs(item.text), spacing: { after: twip(space.entry) } })]
      case 'bullets':
        return item.items.map(bullet)
      case 'inline-list':
        return [new Paragraph({ children: runs(item.items.join(', ')), spacing: { after: twip(space.entry) } })]
      case 'labelled':
        return [
          new Paragraph({
            children: [new TextRun({ text: `${item.label}: `, bold: true }), new TextRun({ text: item.value })],
            spacing: { after: twip(2) },
          }),
        ]
      case 'entry': {
        const title: TextRun[] = [new TextRun({ text: item.primary, bold: true })]
        if (item.secondary) title.push(new TextRun({ text: `, ${item.secondary}` }))
        if (item.dates) title.push(new TextRun({ text: `\t${item.dates}`, bold: false, color: GREY }))
        const out = [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: title,
            tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
            keepNext: true,
          }),
        ]
        if (item.details) out.push(new Paragraph({ children: runs(item.details, { italics: true, color: GREY }), keepNext: true }))
        for (const inner of item.blocks) out.push(...block(inner))
        return out
      }
    }
  }

  const children: Paragraph[] = [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: doc.name })] })]
  if (doc.headline) children.push(new Paragraph({ children: runs(doc.headline, { color: accentColor }), spacing: { after: twip(2) } }))
  if (doc.contact.length > 0) {
    children.push(new Paragraph({ children: runs(doc.contact.join('  |  '), { color: GREY }), spacing: { after: twip(space.section) } }))
  }
  for (const section of doc.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: section.title })] }))
    for (const item of section.blocks) children.push(...block(item))
  }

  const document = new Document({
    title: doc.name,
    creator: doc.name,
    styles: {
      default: {
        document: { run: { font: fontName, size: half(baseSize) }, paragraph: { spacing: { line: Math.round(240 * space.line) } } },
        title: { run: { font: fontName, size: half(baseSize * 2.3), bold: true, color: accentColor }, paragraph: { spacing: { after: twip(2) } } },
        heading1: {
          run: { font: fontName, size: half(baseSize * 1.2), bold: true, allCaps: font !== 'serif', color: accentColor },
          paragraph: {
            spacing: { before: twip(space.section), after: twip(space.entry) },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accentColor, space: 1 } },
            keepNext: true,
          },
        },
        heading2: {
          run: { font: fontName, size: half(baseSize * 1.05), bold: false },
          paragraph: { spacing: { before: twip(space.entry), after: twip(1) } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [{ properties: { page: { size: { width: PAGE_WIDTH, height: 16838 }, margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN } } }, children }],
  })
  return Packer.toBlob(document)
}
