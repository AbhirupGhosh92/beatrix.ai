// The blog's rich-text document: a closed ProseMirror/Tiptap-shaped JSON schema, validated on the
// server and again by the renderer. No HTML is ever stored. This file is copied byte-for-byte to
// functions/src/blogDoc.ts (functions/ is its own package); keep the two identical
// (scripts/check-blog-contract.mjs fails when they differ). It has no imports on purpose.

export type BlogMark =
  | { type: 'bold' | 'italic' | 'underline' | 'strike' | 'code' }
  | { type: 'link'; attrs: { href: string } }
  | { type: 'highlight' | 'textColor'; attrs: { color: string } }
  | { type: 'subscript' | 'superscript' }

export interface BlogNode {
  type: string
  attrs?: Record<string, unknown>
  content?: BlogNode[]
  marks?: BlogMark[]
  text?: string
}

export interface BlogDoc {
  type: 'doc'
  content: BlogNode[]
}

export const MAX_DOC_DEPTH = 12
export const MAX_DOC_NODES = 20_000

const BLOCKS = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'image',
  'table',
  'taskList',
]
const INLINE = ['text', 'hardBreak']
const SIMPLE_MARKS = ['bold', 'italic', 'underline', 'strike', 'code']
export const ALIGN_VALUES = ['left', 'center', 'right', 'justify'] as const
export const BULLET_STYLES = ['disc', 'circle', 'square'] as const
export const ORDERED_STYLES = ['decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'] as const
export const IMAGE_SIZES = ['small', 'medium', 'full'] as const
export const IMAGE_ALIGNS = ['left', 'center', 'right'] as const
export const MAX_TABLE_ROWS = 100
export const MAX_TABLE_COLS = 12
export const MAX_CAPTION_LENGTH = 500
/** A stored color is exactly #rrggbb (rebuilt lowercase on save). */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
export const DEFAULT_MAX_IMAGE_URL_LENGTH = 2000

export interface DocLimits {
  maxImageUrlLength?: number
}

const IMAGE_ID = /^[A-Za-z0-9_-]{1,100}$/
const LANGUAGE = /^[A-Za-z0-9_+#.-]{0,30}$/

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Characters are Unicode code points, so an emoji is 1 everywhere (browser and function agree). */
export function charCount(text: string): number {
  return Array.from(text).length
}

/**
 * True for an absolute https URL with a host and no credentials; no whitespace or control characters.
 * http, javascript:, data:, blob:, relative and protocol-relative values are refused.
 */
export function isHttpsImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value === '' || /[\s\u0000-\u001f\u007f-\u009f]/.test(value)) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === 'https:' && url.hostname !== '' && url.username === '' && url.password === ''
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

/** A value for an error message: control characters removed, at most 20 characters. */
function shown(value: unknown): string {
  const text = typeof value === 'string' ? value : typeof value === 'object' && value !== null ? '[object]' : String(value)
  return Array.from(text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')).slice(0, 20).join('')
}

/** Returns the value when it is one of `allowed`; null/undefined mean "not set" (undefined). */
function checkChoice(attrs: Record<string, unknown>, name: string, allowed: readonly string[]): string | undefined {
  const v = attrs[name]
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string' || !allowed.includes(v)) {
    throw new Error(`The post content is not valid (${name} "${shown(v)}" is not allowed).`)
  }
  return v
}

function checkAttrs(node: Record<string, unknown>, allowed: string[], type: string): Record<string, unknown> {
  const attrs = node.attrs
  if (attrs === undefined || attrs === null) return {}
  if (!isObject(attrs)) throw new Error(`The post content is not valid (${type} attributes).`)
  for (const key of Object.keys(attrs)) {
    if (!allowed.includes(key)) throw new Error(`The post content is not valid (unknown attribute "${key}" on ${type}).`)
  }
  return attrs
}

function checkHref(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000) {
    throw new Error('The post content is not valid (link address).')
  }
  let protocol: string
  try {
    protocol = new URL(value).protocol
  } catch {
    throw new Error('The post content is not valid (link address).')
  }
  if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'mailto:') {
    throw new Error('Links must start with http, https or mailto.')
  }
  return value
}

function checkMarks(value: unknown): BlogMark[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('The post content is not valid (marks).')
  const seen = new Set<string>()
  const out: BlogMark[] = []
  for (const m of value) {
    if (!isObject(m) || typeof m.type !== 'string') throw new Error('The post content is not valid (mark).')
    if (seen.has(m.type)) throw new Error('The post content is not valid (repeated mark).')
    seen.add(m.type)
    if (m.type === 'link') {
      const attrs = checkAttrs(m, ['href'], 'link')
      out.push({ type: 'link', attrs: { href: checkHref(attrs.href) } })
    } else if (m.type === 'highlight' || m.type === 'textColor') {
      const attrs = checkAttrs(m, ['color'], m.type)
      if (!isHexColor(attrs.color)) {
        throw new Error(`The post content is not valid (color "${shown(attrs.color)}" is not allowed).`)
      }
      out.push({ type: m.type, attrs: { color: attrs.color.toLowerCase() } })
    } else if (m.type === 'subscript' || m.type === 'superscript') {
      checkAttrs(m, [], m.type)
      out.push({ type: m.type })
    } else if (SIMPLE_MARKS.includes(m.type)) {
      checkAttrs(m, [], m.type)
      out.push({ type: m.type } as BlogMark)
    } else {
      throw new Error(`The post content is not valid (unknown mark "${m.type}").`)
    }
  }
  if (seen.has('subscript') && seen.has('superscript')) {
    throw new Error('The post content is not valid (subscript and superscript on the same text).')
  }
  return out.length ? out : undefined
}

/** An integer span within 1..max, or 1 when not set. */
function checkSpan(attrs: Record<string, unknown>, name: string, max: number): number {
  const v = attrs[name]
  if (v === undefined || v === null) return 1
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > max) {
    throw new Error(`The post content is not valid (${name} "${shown(v)}" is not allowed).`)
  }
  return v
}

/** The cells of every row must tile a rectangle exactly: no overlap, no gap, no overhang. */
function checkGrid(rows: BlogNode[]): void {
  const fail = () => new Error('The post content is not valid (table cells do not add up).')
  const span = (cell: BlogNode, name: string) => {
    const v = cell.attrs?.[name]
    return typeof v === 'number' ? v : 1
  }
  if (rows.length === 0 || rows.length > MAX_TABLE_ROWS) throw fail()
  const width = (rows[0].content ?? []).reduce((sum, c) => sum + span(c, 'colspan'), 0)
  if (width < 1 || width > MAX_TABLE_COLS) throw fail()
  const taken = rows.map(() => new Array<boolean>(width).fill(false))
  rows.forEach((row, r) => {
    let col = 0
    for (const cell of row.content ?? []) {
      while (col < width && taken[r][col]) col++
      const cs = span(cell, 'colspan')
      const rs = span(cell, 'rowspan')
      if (col + cs > width || r + rs > rows.length) throw fail()
      for (let y = r; y < r + rs; y++) {
        for (let x = col; x < col + cs; x++) {
          if (taken[y][x]) throw fail()
          taken[y][x] = true
        }
      }
      col += cs
    }
    if (taken[r].some((t) => !t)) throw fail()
  })
}

/**
 * Validates an untrusted document against the closed schema and returns a rebuilt copy holding only
 * known fields. Throws an Error with a message for anything else (unknown node, mark or attribute,
 * wrong nesting, depth over 12, more than 20 000 nodes, a link scheme other than http/https/mailto).
 */
export function validateDoc(value: unknown, limits?: DocLimits): BlogDoc {
  let count = 0
  const maxUrl = limits?.maxImageUrlLength ?? DEFAULT_MAX_IMAGE_URL_LENGTH

  const walk = (raw: unknown, depth: number, allowed: string[]): BlogNode => {
    if (depth > MAX_DOC_DEPTH) throw new Error('The post content is nested too deeply.')
    if (++count > MAX_DOC_NODES) throw new Error('The post content has too many elements.')
    if (!isObject(raw) || typeof raw.type !== 'string') throw new Error('The post content is not valid (node).')
    const type = raw.type
    if (!allowed.includes(type)) throw new Error(`The post content is not valid (unexpected "${type}").`)
    const node: BlogNode = { type }
    const content = raw.content
    if (content !== undefined && !Array.isArray(content)) throw new Error('The post content is not valid (content).')
    const children = (list: string[]) => (content ?? []).map((c) => walk(c, depth + 1, list))

    switch (type) {
      case 'text': {
        checkAttrs(raw, [], type)
        if (typeof raw.text !== 'string' || raw.text === '') throw new Error('The post content is not valid (text).')
        if (content !== undefined) throw new Error('The post content is not valid (text).')
        node.text = raw.text
        const marks = checkMarks(raw.marks)
        if (marks) node.marks = marks
        return node
      }
      case 'hardBreak':
      case 'horizontalRule':
        checkAttrs(raw, [], type)
        if (content !== undefined && content.length) throw new Error('The post content is not valid (content).')
        return node
      case 'image': {
        const attrs = checkAttrs(raw, ['imageId', 'src', 'alt', 'size', 'align', 'caption'], type)
        const hasId = attrs.imageId !== undefined && attrs.imageId !== null
        const hasSrc = attrs.src !== undefined && attrs.src !== null
        if (hasId === hasSrc) {
          throw new Error('The post content is not valid (an image needs either an uploaded image or an address, not both).')
        }
        const alt = attrs.alt
        if (alt !== undefined && alt !== null && (typeof alt !== 'string' || charCount(alt) > 500)) {
          throw new Error('The post content is not valid (image description).')
        }
        const altText = typeof alt === 'string' ? alt : null
        if (hasId) {
          if (typeof attrs.imageId !== 'string' || !IMAGE_ID.test(attrs.imageId)) {
            throw new Error('The post content is not valid (image).')
          }
          node.attrs = { imageId: attrs.imageId, alt: altText }
        } else {
          const src = attrs.src
          if (typeof src !== 'string' || charCount(src) > maxUrl) {
            throw new Error(`The image address is too long (limit ${maxUrl} characters).`)
          }
          if (!isHttpsImageUrl(src)) throw new Error('Image addresses must start with https:// and have no spaces.')
          node.attrs = { src, alt: altText }
        }
        const size = checkChoice(attrs, 'size', IMAGE_SIZES)
        const align = checkChoice(attrs, 'align', IMAGE_ALIGNS)
        const caption = attrs.caption
        if (caption !== undefined && caption !== null && (typeof caption !== 'string' || charCount(caption) > MAX_CAPTION_LENGTH)) {
          throw new Error('The post content is not valid (image caption).')
        }
        const out = node.attrs as Record<string, unknown>
        if (size) out.size = size
        if (align) out.align = align
        if (typeof caption === 'string') out.caption = caption
        if (content !== undefined && content.length) throw new Error('The post content is not valid (content).')
        return node
      }
      case 'heading': {
        const attrs = checkAttrs(raw, ['level', 'textAlign'], type)
        if (attrs.level !== 1 && attrs.level !== 2 && attrs.level !== 3) {
          throw new Error('Headings must be level 1, 2 or 3.')
        }
        const align = checkChoice(attrs, 'textAlign', ALIGN_VALUES)
        node.attrs = align ? { level: attrs.level, textAlign: align } : { level: attrs.level }
        if (content) node.content = children(INLINE)
        break
      }
      case 'paragraph': {
        const align = checkChoice(checkAttrs(raw, ['textAlign'], type), 'textAlign', ALIGN_VALUES)
        if (align) node.attrs = { textAlign: align }
        if (content) node.content = children(INLINE)
        break
      }
      case 'codeBlock': {
        const attrs = checkAttrs(raw, ['language'], type)
        const lang = attrs.language
        if (lang !== undefined && lang !== null && (typeof lang !== 'string' || !LANGUAGE.test(lang))) {
          throw new Error('The post content is not valid (code language).')
        }
        node.attrs = { language: typeof lang === 'string' && lang ? lang : null }
        if (content) {
          node.content = children(['text'])
          if (node.content.some((c) => c.marks)) throw new Error('The post content is not valid (code block).')
        }
        break
      }
      case 'bulletList': {
        const style = checkChoice(checkAttrs(raw, ['listStyle'], type), 'listStyle', BULLET_STYLES)
        if (style) node.attrs = { listStyle: style }
        if (content) node.content = children(['listItem'])
        break
      }
      case 'orderedList': {
        const attrs = checkAttrs(raw, ['start', 'type', 'listStyle'], type)
        const start = attrs.start
        if (start !== undefined && start !== null && (!Number.isInteger(start) || (start as number) < 1 || (start as number) > 1_000_000)) {
          throw new Error('The post content is not valid (list start).')
        }
        if (attrs.type !== undefined && attrs.type !== null) throw new Error('The post content is not valid (list type).')
        const style = checkChoice(attrs, 'listStyle', ORDERED_STYLES)
        node.attrs = { start: typeof start === 'number' ? start : 1, ...(style ? { listStyle: style } : {}) }
        if (content) node.content = children(['listItem'])
        break
      }
      case 'listItem':
        checkAttrs(raw, [], type)
        if (content) node.content = children(BLOCKS)
        break
      case 'blockquote':
        checkAttrs(raw, [], type)
        if (content) node.content = children(BLOCKS)
        break
      case 'taskList':
        checkAttrs(raw, [], type)
        if (content) node.content = children(['taskItem'])
        break
      case 'taskItem': {
        const checked = checkAttrs(raw, ['checked'], type).checked
        if (checked !== undefined && checked !== null && typeof checked !== 'boolean') {
          throw new Error(`The post content is not valid (checked "${shown(checked)}" is not allowed).`)
        }
        node.attrs = { checked: checked === true }
        if (content) {
          node.content = children(['paragraph'])
          if (node.content.length !== 1) throw new Error('The post content is not valid (task item).')
        }
        break
      }
      case 'table':
        checkAttrs(raw, [], type)
        node.content = children(['tableRow'])
        checkGrid(node.content)
        break
      case 'tableRow':
        checkAttrs(raw, [], type)
        if (content) node.content = children(['tableHeader', 'tableCell'])
        break
      case 'tableHeader':
      case 'tableCell': {
        const attrs = checkAttrs(raw, ['colspan', 'rowspan', 'colwidth'], type)
        if (attrs.colwidth !== undefined && attrs.colwidth !== null) {
          throw new Error(`The post content is not valid (colwidth "${shown(attrs.colwidth)}" is not allowed).`)
        }
        const colspan = checkSpan(attrs, 'colspan', MAX_TABLE_COLS)
        const rowspan = checkSpan(attrs, 'rowspan', MAX_TABLE_ROWS)
        if (colspan > 1 || rowspan > 1) {
          node.attrs = { ...(colspan > 1 ? { colspan } : {}), ...(rowspan > 1 ? { rowspan } : {}) }
        }
        node.content = children(['paragraph'])
        if (node.content.length !== 1) throw new Error('The post content is not valid (table cell).')
        break
      }
      case 'doc':
        checkAttrs(raw, [], type)
        if (content) node.content = children(BLOCKS)
        break
    }
    return node
  }

  const root = walk(value, 0, ['doc'])
  return { type: 'doc', content: root.content ?? [] }
}

function inlineText(nodes: BlogNode[] | undefined): string {
  return (nodes ?? []).map((n) => (n.type === 'hardBreak' ? '\n' : (n.text ?? ''))).join('')
}

function lines(node: BlogNode): string[] {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
    case 'codeBlock':
      return [inlineText(node.content)]
    case 'image':
      return typeof node.attrs?.caption === 'string' ? [node.attrs.caption] : []
    case 'horizontalRule':
      return []
    default:
      return (node.content ?? []).flatMap(lines)
  }
}

/** Visible text of a document, one line per block (empty blocks, images and rules add nothing). */
export function docText(doc: BlogDoc): string {
  return doc.content
    .flatMap(lines)
    .filter((l) => l !== '')
    .join('\n')
}

/** Plain-text excerpt: whitespace collapsed, cut at a word where possible, `n` code points at most. */
export function docExcerpt(doc: BlogDoc, n: number): string {
  const chars = Array.from(docText(doc).replace(/\s+/g, ' ').trim())
  if (chars.length <= n) return chars.join('')
  const cut = chars.slice(0, n)
  const space = cut.lastIndexOf(' ')
  return `${(space > n * 0.6 ? cut.slice(0, space) : cut).join('').trimEnd()}…`
}
