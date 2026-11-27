import { Fragment } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  ALIGN_VALUES,
  BULLET_STYLES,
  IMAGE_ALIGNS,
  IMAGE_SIZES,
  ORDERED_STYLES,
  isHexColor,
  isHttpsImageUrl,
  validateDoc,
} from '../../lib/blogDoc.ts'
import { readableInk } from '../../lib/blogColor.ts'
import type { BlogMark, BlogNode } from '../../lib/blogDoc.ts'
import BlogPreview from './BlogPreview.tsx'

// Renders a post for readers (public page and the author's view mode). The document is re-validated
// (defence in depth) and mapped to React elements: no HTML is parsed, no dangerouslySetInnerHTML,
// links are limited to http/https/mailto, and an image only ever comes from `imageUrl(imageId)`,
// from an uploaded id or a validated https URL. Alignment and list styles map to fixed class names
// through lookup tables; a stored string is never written into class, style or any attribute. The one
// exception is a free text or highlight color: a value that passes isHexColor (#rrggbb) is set only as
// the CSS custom properties --blog-color, --blog-hl and --blog-hl-ink through React's style object. A legacy Markdown post goes through the safe Markdown renderer.
const SAFE_LINK = /^(https?:|mailto:)/i
const IMAGE_ID = /^[A-Za-z0-9_-]+$/

// Lookup tables built from the whitelists: the class names come from these constants, never from stored text.
const ALIGN_CLASS = new Map<string, string>(ALIGN_VALUES.map((v) => [v, `blog-align-${v}`]))
const BULLET_CLASS = new Map<string, string>(BULLET_STYLES.map((v) => [v, `blog-list-${v}`]))
const ORDERED_CLASS = new Map<string, string>(ORDERED_STYLES.map((v) => [v, `blog-list-${v}`]))

const IMAGE_SIZE_CLASS = new Map<string, string>(IMAGE_SIZES.map((v) => [v, `blog-img-size-${v}`]))
const IMAGE_ALIGN_CLASS = new Map<string, string>(IMAGE_ALIGNS.map((v) => [v, `blog-img-align-${v}`]))

function pick(table: Map<string, string>, value: unknown): string | undefined {
  return typeof value === 'string' ? table.get(value) : undefined
}

interface Props {
  format: 'markdown' | 'doc'
  body?: string
  content?: unknown
  imageUrl: (imageId: string) => string
}

function colorOf(mark: BlogMark): string | null {
  if (mark.type !== 'highlight' && mark.type !== 'textColor') return null
  return isHexColor(mark.attrs.color) ? mark.attrs.color.toLowerCase() : null
}

function applyMark(mark: BlogMark, child: ReactNode): ReactNode {
  switch (mark.type) {
    case 'subscript':
      return <sub>{child}</sub>
    case 'superscript':
      return <sup>{child}</sup>
    case 'textColor': {
      const hex = colorOf(mark)
      return hex ? (
        <span className="blog-color" style={{ '--blog-color': hex } as CSSProperties}>
          {child}
        </span>
      ) : (
        child
      )
    }
    case 'highlight': {
      const hex = colorOf(mark)
      return hex ? (
        <span className="blog-hl" style={{ '--blog-hl': hex, '--blog-hl-ink': readableInk(hex) } as CSSProperties}>
          {child}
        </span>
      ) : (
        child
      )
    }
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

// Image caption rule: a non-empty caption is shown; "" shows none; null or absent (older posts) shows the
// alt text as before. A figure is used when there is a caption or a size or alignment class; otherwise the
// image stays bare.
function captioned(key: string, img: ReactNode, alt: string, attrs: BlogNode['attrs']): ReactNode {
  const caption = typeof attrs?.caption === 'string' ? attrs.caption : alt
  const size = pick(IMAGE_SIZE_CLASS, attrs?.size)
  const align = pick(IMAGE_ALIGN_CLASS, attrs?.align)
  const hasCaption = caption.trim() !== ''
  if (!hasCaption && !size && !align) return <Fragment key={key}>{img}</Fragment>
  const className = [size, align].filter(Boolean).join(' ') || undefined
  return (
    <figure key={key} className={className}>
      {img}
      {hasCaption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function renderNode(node: BlogNode, key: string, imageUrl: (id: string) => string): ReactNode {
  const children = (node.content ?? []).map((child, i) => renderNode(child, `${key}.${i}`, imageUrl))
  switch (node.type) {
    case 'text': {
      let out: ReactNode = node.text ?? ''
      // Canonical order, whatever the stored order: text color innermost, then the other marks, highlight outermost.
      const marks = node.marks ?? []
      for (const mark of marks.filter((m) => m.type === 'textColor')) out = applyMark(mark, out)
      for (const mark of marks.filter((m) => m.type !== 'textColor' && m.type !== 'highlight')) out = applyMark(mark, out)
      for (const mark of marks.filter((m) => m.type === 'highlight')) out = applyMark(mark, out)
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
    case 'taskList':
      return <ul key={key} className="blog-task-list">{children}</ul>
    case 'taskItem': {
      const labelId = `task-${key}`
      return (
        <li key={key} className="blog-task">
          <input type="checkbox" disabled checked={node.attrs?.checked === true} readOnly aria-labelledby={labelId} />
          <div id={labelId}>{children}</div>
        </li>
      )
    }
    case 'table':
      return (
        <div key={key} className="blog-table-scroll">
          <table>
            <tbody>
              {(node.content ?? []).map((row, r) => (
                <tr key={`${key}.${r}`}>
                  {(row.content ?? []).map((cell, c) => {
                    const colSpan = typeof cell.attrs?.colspan === 'number' ? cell.attrs.colspan : undefined
                    const rowSpan = typeof cell.attrs?.rowspan === 'number' ? cell.attrs.rowspan : undefined
                    const cellKey = `${key}.${r}.${c}`
                    const inner = (cell.content ?? []).map((child, i) => renderNode(child, `${cellKey}.${i}`, imageUrl))
                    return cell.type === 'tableHeader' ? (
                      <th key={cellKey} scope={r === 0 ? 'col' : 'row'} colSpan={colSpan} rowSpan={rowSpan}>
                        {inner}
                      </th>
                    ) : (
                      <td key={cellKey} colSpan={colSpan} rowSpan={rowSpan}>
                        {inner}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'hardBreak':
      return <br key={key} />
    case 'image': {
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
      const id = node.attrs?.imageId
      const src = node.attrs?.src
      if (typeof id === 'string' && IMAGE_ID.test(id)) {
        // eslint-disable-next-line @next/next/no-img-element
        return captioned(key, <img src={imageUrl(id)} alt={alt} loading="lazy" decoding="async" />, alt, node.attrs)
      }
      if (isHttpsImageUrl(src)) {
        return captioned(
          key,
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />,
          alt,
          node.attrs,
        )
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
