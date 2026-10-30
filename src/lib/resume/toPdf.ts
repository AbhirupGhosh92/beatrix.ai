// PDF output, drawn in the browser with the PDF standard fonts (no font files to ship). It follows
// the template's style as closely as possible: font, size, accent color, spacing and one of two
// layouts. Written with createElement so it needs no JSX transform.
import { createElement as h, type ReactElement } from 'react'
import { Document, Font, Page, Text, View, pdf, type DocumentProps } from '@react-pdf/renderer'
import type { ResumeTemplate } from '../../data/resumeConfig.ts'
import { isPdfSafe, type Block, type DocSection, type ResumeDocument } from './model.ts'
import { PDF_FONTS, SPACING, tint } from './style.ts'

const GREY = '#555555'
const MARGIN = 40

// Words are never hyphenated; a long word wraps whole.
Font.registerHyphenationCallback((word) => [word])

/** The standard fonts cannot draw characters outside Windows-1252, so those become `?`. */
const safe = (value: string) => [...value].map((ch) => (isPdfSafe(ch) ? ch : '?')).join('')

type Style = Record<string, string | number | undefined>

export function createPdfElement(doc: ResumeDocument, template: ResumeTemplate): ReactElement<DocumentProps> {
  const { font, baseSize, accent, spacing } = template.style
  const fonts = PDF_FONTS[font]
  const space = SPACING[spacing]
  const lineHeight = space.line

  const text = (style: Style, value: string, key?: string) => h(Text, { key, style: { fontFamily: fonts.regular, fontSize: baseSize, lineHeight, ...style } }, safe(value))

  const bullet = (item: string, key: string) =>
    h(View, { key, style: { flexDirection: 'row', marginBottom: 1 } }, text({ width: 10 }, '•'), text({ flex: 1 }, item))

  const renderBlock = (block: Block, key: string): ReactElement => {
    switch (block.kind) {
      case 'paragraph':
        return text({ marginBottom: space.entry }, block.text, key)
      case 'bullets':
        return h(View, { key, style: { marginBottom: space.entry } }, ...block.items.map((item, i) => bullet(item, `${key}-${i}`)))
      case 'inline-list':
        return text({ marginBottom: space.entry }, block.items.join(', '), key)
      case 'labelled':
        return h(
          Text,
          { key, style: { fontFamily: fonts.regular, fontSize: baseSize, lineHeight, marginBottom: 2 } },
          h(Text, { style: { fontFamily: fonts.bold } }, safe(`${block.label}: `)),
          safe(block.value),
        )
      case 'entry': {
        const title = h(
          Text,
          { style: { fontFamily: fonts.regular, fontSize: baseSize * 1.05, lineHeight, flex: 1, paddingRight: 8 } },
          h(Text, { style: { fontFamily: fonts.bold } }, safe(block.primary)),
          block.secondary ? safe(`, ${block.secondary}`) : '',
        )
        const [firstInner, ...restInner] = block.blocks
        // The title row, details and first block never split from each other across a page.
        return h(
          View,
          { key, style: { marginTop: space.entry, marginBottom: space.entry / 2 } },
          h(
            View,
            { wrap: false },
            h(View, { style: { flexDirection: 'row', justifyContent: 'space-between' } }, title, block.dates ? text({ color: GREY }, block.dates) : null),
            block.details ? text({ fontFamily: fonts.italic, color: GREY }, block.details) : null,
            firstInner ? renderBlock(firstInner, `${key}-0`) : null,
          ),
          ...restInner.map((inner, i) => renderBlock(inner, `${key}-${i + 1}`)),
        )
      }
    }
  }

  const sectionView = (section: DocSection, key: string) => {
    const [first, ...rest] = section.blocks
    // The heading always stays on the same page as the first thing under it.
    return h(
      View,
      { key },
      h(
        View,
        { wrap: false },
        h(
          Text,
          {
            style: {
              fontFamily: fonts.bold,
              fontSize: baseSize * 1.2,
              color: accent,
              textTransform: font === 'serif' ? undefined : 'uppercase',
              marginTop: space.section,
              marginBottom: space.entry,
              paddingBottom: 1,
              borderBottomWidth: 1,
              borderBottomColor: accent,
            },
          },
          safe(section.title),
        ),
        first ? renderBlock(first, `${key}-0`) : null,
      ),
      ...rest.map((block, i) => renderBlock(block, `${key}-${i + 1}`)),
    )
  }

  const heading = h(
    View,
    { key: 'heading' },
    text({ fontFamily: fonts.bold, fontSize: baseSize * 2.3, color: accent, lineHeight: 1.15 }, doc.name),
    doc.headline ? text({ color: accent, fontSize: baseSize * 1.15 }, doc.headline) : null,
  )

  let body: ReactElement[]
  if (template.layout === 'sidebar') {
    const side = doc.sections.filter((section) => section.compact)
    const main = doc.sections.filter((section) => !section.compact)
    body = [
      heading,
      h(
        View,
        { key: 'columns', style: { flexDirection: 'row', marginTop: space.section } },
        h(
          View,
          { style: { width: '30%', backgroundColor: tint(accent), padding: 10, marginRight: 14 } },
          h(Text, { style: { fontFamily: fonts.bold, fontSize: baseSize * 1.1, color: accent, marginBottom: 4 } }, 'CONTACT'),
          ...doc.contact.map((line, i) => text({ marginBottom: 3, fontSize: baseSize * 0.95 }, line, `c${i}`)),
          ...side.map((section, i) => sectionView(section, `side-${i}`)),
        ),
        h(View, { style: { flex: 1 } }, ...main.map((section, i) => sectionView(section, `main-${i}`))),
      ),
    ]
  } else {
    body = [
      heading,
      doc.contact.length > 0 ? text({ color: GREY, fontSize: baseSize * 0.95 }, doc.contact.join('  |  '), 'contact') : h(View, { key: 'contact' }),
      ...doc.sections.map((section, i) => sectionView(section, `s-${i}`)),
    ]
  }

  return h(Document, { title: safe(doc.name), author: safe(doc.name) }, h(Page, { size: 'A4', style: { padding: MARGIN } }, ...body)) as ReactElement<DocumentProps>
}

export async function toPdf(doc: ResumeDocument, template: ResumeTemplate): Promise<Blob> {
  return pdf(createPdfElement(doc, template)).toBlob()
}
