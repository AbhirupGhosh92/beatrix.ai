import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { ALIGN_VALUES, BULLET_STYLES, ORDERED_STYLES, isHttpsImageUrl, validateDoc } from '../../lib/blogDoc.ts'
import type { BlogMark, BlogNode } from '../../lib/blogDoc.ts'
import BlogPreview from './BlogPreview.tsx'

// Renders a post for readers (public page and the author's view mode). The document is re-validated
// (defence in depth) and mapped to React elements: no HTML is parsed, no dangerouslySetInnerHTML,
// links are limited to http/https/mailto, and an image only ever comes from `imageUrl(imageId)`,
// from an uploaded id or a validated https URL. Alignment and list styles map to fixed class names
// through lookup tables; a stored string is never written into class, style or any attribute. A legacy Markdown post goes through the safe Markdown renderer.
const SAFE_LINK = /^(https?:|mailto:)/i
const IMAGE_ID = /^[A-Za-z0-9_-]+$/

// Lookup tables built from the whitelists: the class names come from these constants, never from stored text.
const ALIGN_CLASS = new Map<string, string>(ALIGN_VALUES.map((v) => [v, `blog-align-${v}`]))
const BULLET_CLASS = new Map<string, string>(BULLET_STYLES.map((v) => [v, `blog-list-${v}`]))
const ORDERED_CLASS = new Map<string, string>(ORDERED_STYLES.map((v) => [v, `blog-list-${v}`]))

function pick(table: Map<string, string>, value: unknown): string | undefined {
  return typeof value === 'string' ? table.get(value) : undefined
}

interface Props {
  format: 'markdown' | 'doc'
  body?: string
  content?: unknown
  imageUrl: (imageId: string) => string
}

function applyMark(mark: BlogMark, child: ReactNode): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong>{child}</strong>
    case 'italic':
      return <em>{child}</em>
    case 'underline':
      return <u>{child}</u>
    case 'strike':
      return <s>{child}</s>
    case 'code':
      return <code>{child}</code>
    case 'link':
      return SAFE_LINK.test(mark.attrs.href) ? (
        <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer nofollow ugc">
          {child}
        </a>
      ) : (
        child
      )
    default:
      return child
  }
}

function renderNode(node: BlogNode, key: string, imageUrl: (id: string) => string): ReactNode {
  const children = (node.content ?? []).map((child, i) => renderNode(child, `${key}.${i}`, imageUrl))
  switch (node.type) {
    case 'text': {
      let out: ReactNode = node.text ?? ''
      for (const mark of node.marks ?? []) out = applyMark(mark, out)
      return <Fragment key={key}>{out}</Fragment>
    }
    case 'paragraph':
      return <p key={key} className={pick(ALIGN_CLASS, node.attrs?.textAlign)}>{children}</p>
    case 'heading': {
      const level = node.attrs?.level
      const align = pick(ALIGN_CLASS, node.attrs?.textAlign)
      if (level === 1) return <h1 key={key} className={align}>{children}</h1>
      if (level === 2) return <h2 key={key} className={align}>{children}</h2>
      return <h3 key={key} className={align}>{children}</h3>
    }
    case 'bulletList':
      return <ul key={key} className={pick(BULLET_CLASS, node.attrs?.listStyle)}>{children}</ul>
    case 'orderedList':
      return <ol key={key} className={pick(ORDERED_CLASS, node.attrs?.listStyle)}>{children}</ol>
    case 'listItem':
      return <li key={key}>{children}</li>
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      )
    case 'horizontalRule':
      return <hr key={key} />
    case 'hardBreak':
      return <br key={key} />
    case 'image': {
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
      const id = node.attrs?.imageId
      const src = node.attrs?.src
      if (typeof id === 'string' && IMAGE_ID.test(id)) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={key} src={imageUrl(id)} alt={alt} loading="lazy" decoding="async" />
      }
      if (isHttpsImageUrl(src)) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={key} src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      }
      return null
    }
    default:
      return null
  }
}

export default function BlogContent({ format, body, content, imageUrl }: Props) {
  if (format === 'doc') {
    let doc
    try {
      doc = validateDoc(content)
    } catch {
      return null
    }
    return <div className="blog-prose">{doc.content.map((node, i) => renderNode(node, String(i), imageUrl))}</div>
  }
  return <BlogPreview body={body ?? ''} imageUrl={imageUrl} />
}
