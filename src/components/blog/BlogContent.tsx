import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { validateDoc } from '../../lib/blogDoc.ts'
import type { BlogMark, BlogNode } from '../../lib/blogDoc.ts'
import BlogPreview from './BlogPreview.tsx'

// Renders a post for readers (public page and the author's view mode). The document is re-validated
// (defence in depth) and mapped to React elements: no HTML is parsed, no dangerouslySetInnerHTML,
// links are limited to http/https/mailto, and an image only ever comes from `imageUrl(imageId)`,
// never from a remote source. A legacy Markdown post goes through the safe Markdown renderer.
const SAFE_LINK = /^(https?:|mailto:)/i
const IMAGE_ID = /^[A-Za-z0-9_-]+$/

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
      return <p key={key}>{children}</p>
    case 'heading': {
      const level = node.attrs?.level
      if (level === 1) return <h1 key={key}>{children}</h1>
      if (level === 2) return <h2 key={key}>{children}</h2>
      return <h3 key={key}>{children}</h3>
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>
    case 'orderedList':
      return <ol key={key}>{children}</ol>
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
      const id = node.attrs?.imageId
      if (typeof id !== 'string' || !IMAGE_ID.test(id)) return null
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} src={imageUrl(id)} alt={alt} loading="lazy" />
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
