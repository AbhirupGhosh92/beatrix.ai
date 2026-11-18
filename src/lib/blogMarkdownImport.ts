// Legacy Markdown posts are converted to the rich-text document when an author opens them in the
// editor. The document cannot hold everything Markdown can, so the body is scanned first and the
// editor tells the author what saving will drop. Pure and dependency-free: it only reads text.

export type MarkdownLoss = 'tables' | 'task lists' | 'raw HTML' | 'remote images'

const FENCE = /^\s*(```|~~~)/

/** The Markdown outside code fences and inline code, so examples in code are not flagged. */
function withoutCode(markdown: string): string {
  const out: string[] = []
  let fence: string | null = null
  for (const line of markdown.split('\n')) {
    const m = FENCE.exec(line)
    if (m) {
      fence = fence === null ? m[1] : fence === m[1] ? null : fence
      continue
    }
    if (fence === null) out.push(line.replace(/`[^`\n]*`/g, ''))
  }
  return out.join('\n')
}

/** What a conversion of this Markdown to the editor document will drop, in a stable order. */
export function scanLegacyMarkdown(markdown: string): MarkdownLoss[] {
  const text = withoutCode(markdown)
  const found: MarkdownLoss[] = []
  // A GFM table: a header row followed by a delimiter row such as | --- | :-: |.
  if (/^\s*\|?[^\n|]*\|[^\n]*\n\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/m.test(text)) found.push('tables')
  if (/^\s*[-*+]\s+\[[ xX]\]\s/m.test(text)) found.push('task lists')
  if (/<\/?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*)?\/?>|<!--/.test(text)) found.push('raw HTML')
  const images = text.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)
  if ([...images].some((m) => !m[1].startsWith('blog-image:'))) found.push('remote images')
  return found
}

const DELIMITER_ROW = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/

/** Applies `fn` to the text outside inline code spans of one line. */
function outsideCode(line: string, fn: (text: string) => string): string {
  return line
    .split(/(`[^`\n]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('')
}

function stripInline(text: string): string {
  return (
    text
      // An image of this site stays, alone in its own paragraph (images are blocks in the document);
      // any other image is a remote image and is dropped.
      .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_all, alt: string, src: string) =>
        /^\s*blog-image:[A-Za-z0-9_-]+\s*$/.test(src) ? `\n\n![${alt}](${src.trim()})\n\n` : '',
      )
      // Raw HTML tags and comments go; the text between tags stays.
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*)?\/?>/g, '')
  )
}

/**
 * The Markdown the editor can convert without error: what scanLegacyMarkdown reports is removed
 * (tables become plain lines of text, task boxes and HTML tags go, remote images are dropped) and
 * own images are put in their own paragraph. Code blocks and inline code are left as they are.
 */
export function prepareLegacyMarkdown(markdown: string): string {
  const out: string[] = []
  const lines = markdown.split('\n')
  let fence: string | null = null
  let inTable = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = FENCE.exec(line)
    if (m) {
      fence = fence === null ? m[1] : fence === m[1] ? null : fence
      out.push(line)
      continue
    }
    if (fence !== null) {
      out.push(line)
      continue
    }
    if (!inTable && line.includes('|') && i + 1 < lines.length && DELIMITER_ROW.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      inTable = true
    }
    if (inTable) {
      if (line.trim() === '' || !line.includes('|')) {
        inTable = false
      } else if (DELIMITER_ROW.test(line)) {
        continue
      } else {
        const cells = line
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
        out.push(outsideCode(cells.join(' | '), stripInline), '')
        continue
      }
    }
    out.push(outsideCode(line, stripInline).replace(/^(\s*[-*+]\s+)\[[ xX]\]\s/, '$1'))
  }
  // Repeated blank lines would become empty paragraphs: keep one outside code blocks.
  const result: string[] = []
  fence = null
  for (const line of out.join('\n').split('\n')) {
    const m = FENCE.exec(line)
    if (m) fence = fence === null ? m[1] : fence === m[1] ? null : fence
    else if (fence === null && line.trim() === '' && (result.length === 0 || result[result.length - 1].trim() === '')) continue
    result.push(line)
  }
  return result.join('\n')
}
