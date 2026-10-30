// Markdown output: content only, no styling, so the template does not apply.
import type { Block, ResumeDocument } from './model.ts'

/** Escapes characters that would turn user text into Markdown formatting. */
function esc(value: string): string {
  return value.replace(/([\\`*_[\]<>])/g, '\\$1').replace(/^([#+-])/gm, '\\$1')
}

const lines = (value: string) => esc(value).split('\n').join('  \n')

function renderBlock(block: Block): string {
  switch (block.kind) {
    case 'paragraph':
      return lines(block.text)
    case 'bullets':
      return block.items.map((item) => `- ${esc(item)}`).join('\n')
    case 'inline-list':
      return block.items.map(esc).join(', ')
    case 'labelled':
      return `**${esc(block.label)}:** ${esc(block.value)}`
    case 'entry': {
      const heading = [block.primary, block.secondary].filter(Boolean).map(esc).join(' - ')
      const meta = [block.details, block.dates].filter(Boolean).map(esc).join(' | ')
      return [`### ${heading}`, meta && `*${meta}*`, ...block.blocks.map(renderBlock)].filter(Boolean).join('\n\n')
    }
  }
}

export function toMarkdown(doc: ResumeDocument): string {
  const out: string[] = [`# ${esc(doc.name)}`]
  if (doc.headline) out.push(esc(doc.headline))
  if (doc.contact.length > 0) out.push(doc.contact.map(esc).join(' | '))
  for (const section of doc.sections) {
    out.push(`## ${esc(section.title)}`, ...section.blocks.map(renderBlock))
  }
  return `${out.join('\n\n')}\n`
}
