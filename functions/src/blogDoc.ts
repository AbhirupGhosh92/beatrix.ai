// The blog's rich-text document: a closed ProseMirror/Tiptap-shaped JSON schema, validated on the
// server and again by the renderer. No HTML is ever stored. This file is copied byte-for-byte to
// functions/src/blogDoc.ts (functions/ is its own package); keep the two identical
// (scripts/check-blog-contract.mjs fails when they differ). It has no imports on purpose.

export type BlogMark =
  | { type: 'bold' | 'italic' | 'underline' | 'strike' | 'code' }
  | { type: 'link'; attrs: { href: string } }

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

const BLOCKS = ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'horizontalRule', 'image']
const INLINE = ['text', 'hardBreak']
const SIMPLE_MARKS = ['bold', 'italic', 'underline', 'strike', 'code']
const IMAGE_ID = /^[A-Za-z0-9_-]{1,100}$/
const LANGUAGE = /^[A-Za-z0-9_+#.-]{0,30}$/

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Characters are Unicode code points, so an emoji is 1 everywhere (browser and function agree). */
export function charCount(text: string): number {
  return Array.from(text).length
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
    } else if (SIMPLE_MARKS.includes(m.type)) {
      checkAttrs(m, [], m.type)
      out.push({ type: m.type } as BlogMark)
    } else {
      throw new Error(`The post content is not valid (unknown mark "${m.type}").`)
    }
  }
  return out.length ? out : undefined
}

/**
 * Validates an untrusted document against the closed schema and returns a rebuilt copy holding only
 * known fields. Throws an Error with a message for anything else (unknown node, mark or attribute,
 * wrong nesting, depth over 12, more than 20 000 nodes, a link scheme other than http/https/mailto).
 */
export function validateDoc(value: unknown): BlogDoc {
  let count = 0

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
        const attrs = checkAttrs(raw, ['imageId', 'alt'], type)
        if (typeof attrs.imageId !== 'string' || !IMAGE_ID.test(attrs.imageId)) {
          throw new Error('The post content is not valid (image).')
        }
        const alt = attrs.alt
        if (alt !== undefined && alt !== null && (typeof alt !== 'string' || charCount(alt) > 500)) {
          throw new Error('The post content is not valid (image description).')
        }
        node.attrs = { imageId: attrs.imageId, alt: typeof alt === 'string' ? alt : null }
        if (content !== undefined && content.length) throw new Error('The post content is not valid (content).')
        return node
      }
      case 'heading': {
        const attrs = checkAttrs(raw, ['level'], type)
        if (attrs.level !== 1 && attrs.level !== 2 && attrs.level !== 3) {
          throw new Error('Headings must be level 1, 2 or 3.')
        }
        node.attrs = { level: attrs.level }
        if (content) node.content = children(INLINE)
        break
      }
      case 'paragraph':
        checkAttrs(raw, [], type)
        if (content) node.content = children(INLINE)
        break
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
      case 'bulletList':
        checkAttrs(raw, [], type)
        if (content) node.content = children(['listItem'])
        break
      case 'orderedList': {
        const attrs = checkAttrs(raw, ['start', 'type'], type)
        const start = attrs.start
        if (start !== undefined && start !== null && (!Number.isInteger(start) || (start as number) < 1 || (start as number) > 1_000_000)) {
          throw new Error('The post content is not valid (list start).')
        }
        if (attrs.type !== undefined && attrs.type !== null) throw new Error('The post content is not valid (list type).')
        node.attrs = { start: typeof start === 'number' ? start : 1 }
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
