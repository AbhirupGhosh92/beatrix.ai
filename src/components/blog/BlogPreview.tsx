'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { BLOG_IMAGE_SCHEME } from '../../lib/blogTypes.ts'

// Markdown preview of a post body (design D5). Raw HTML is not rendered (skipHtml, no rehype-raw),
// `blog-image:<id>` maps to the image API route of this post, every other image source is dropped,
// and links are limited to http, https and mailto.
const SAFE_LINK = /^(https?:|mailto:)/i
const IMAGE_ID = /^[A-Za-z0-9_-]+$/

/** The URL an image reference resolves to, or null when it is not one of this post's own images. */
export function resolveBlogImage(src: string | undefined, postId: string | null): string | null {
  if (!src || !postId || !src.startsWith(BLOG_IMAGE_SCHEME)) return null
  const id = src.slice(BLOG_IMAGE_SCHEME.length)
  return IMAGE_ID.test(id) ? `/api/blog/${encodeURIComponent(postId)}/images/${id}` : null
}

export default function BlogPreview({ body, postId }: { body: string; postId: string | null }) {
  const components: Components = {
    img: ({ src, alt }) => {
      const url = resolveBlogImage(typeof src === 'string' ? src : undefined, postId)
      // eslint-disable-next-line @next/next/no-img-element
      return url ? <img src={url} alt={alt ?? ''} loading="lazy" /> : null
    },
    a: ({ href, children }) =>
      href && SAFE_LINK.test(href) ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <span>{children}</span>
      ),
  }
  return (
    <div className="blog-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={components}
        // Keep the blog-image scheme for the img mapper above; the mappers drop everything unsafe.
        urlTransform={(url) => url}
      >
        {body}
      </Markdown>
    </div>
  )
}
