// Legacy Markdown posts are converted to the rich-text document when an author opens them in the
// editor. The document cannot hold everything Markdown can, so the body is scanned first and the
// editor tells the author what saving will drop. Tables and task lists convert to their own nodes. Pure and dependency-free: it only reads text.

export type MarkdownLoss = 'raw HTML' | 'remote images' | 'images inside tables' | 'details nested in task items'

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
  if (/<\/?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*)?\/?>|<!--/.test(text)) found.push('raw HTML')
  const images = text.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)
  if ([...images].some((m) => !m[1].startsWith('blog-image:'))) found.push('remote images')
  // A task item holds one paragraph: text nested under it is moved out, next to the task.
  if (/^[ \t]*[-*+]\s+\[[ xX]\]\s[^\n]*\n(?:[ \t]*\n)*[ \t]+\S/m.test(text)) found.push('details nested in task items')
  // A table cell holds text only, so an image of this site inside a table row cannot be kept.
  if (tableRows(text).some((row) => /!\[[^\]]*\]\(\s*<?blog-image:/.test(row))) found.push('images inside tables')
  return found
}

/** The lines that belong to a GFM table (a header row plus a delimiter row, then rows while they contain a pipe). */
function tableRows(markdown: string): string[] {
  const lines = markdown.split('\n')
  const rows: string[] = []
  let inTable = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!inTable && line.includes('|') && i + 1 < lines.length && DELIMITER_ROW.test(lines[i + 1]) && lines[i + 1].includes('-')) inTable = true
    if (inTable) {
      if (line.trim() === '' || !line.includes('|')) inTable = false
      else rows.push(line)
    }
  }
  return rows
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
 * (HTML tags go, remote images and images inside tables are dropped) and own images are put in their own
 * paragraph. Tables and task lists are left for the editor to convert. Code blocks and inline code are left as they are.
 */
export function prepareLegacyMarkdown(markdown: string): string {
  const out: string[] = []
  const lines = markdown.split('\n')
  let fence: string | null = null
  let inTable = false
  // Indentation of the task item whose continuation lines are being read (null outside one).
  let taskIndent: number | null = null
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
      } else {
        // The table stays a table; a cell holds text only, so every image in it is dropped.
        out.push(outsideCode(line, (text) => stripInline(text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, ''))))
        continue
      }
    }
    let next = outsideCode(line, stripInline)
    const indent = next.length - next.trimStart().length
    if (taskIndent !== null && next.trim() !== '' && indent > taskIndent) {
      // A task item holds one paragraph: nested lists, nested tasks and further paragraphs move out to the task's level.
      next = ' '.repeat(taskIndent) + next.trimStart()
    } else if (next.trim() !== '') {
      taskIndent = /^[ \t]*[-*+]\s+\[[ xX]\]\s/.test(next) ? indent : null
    }
    out.push(next)
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
