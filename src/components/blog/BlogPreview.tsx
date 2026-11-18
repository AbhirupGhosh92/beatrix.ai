import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { BLOG_IMAGE_SCHEME } from '../../lib/blogTypes.ts'

// Markdown renderer of a legacy post body (design D5, D6); no hooks, so server components use it too. Raw HTML is not rendered (skipHtml, no rehype-raw),
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

interface Props {
  body: string
  /** Author preview: images resolve to this post's authenticated image route. */
  postId?: string | null
  /** Reader views: images resolve through this function instead (the public route for readers). */
  imageUrl?: (imageId: string) => string
}

export default function BlogPreview({ body, postId = null, imageUrl }: Props) {
  const components: Components = {
    img: ({ src, alt }) => {
      const source = typeof src === 'string' ? src : undefined
      let url: string | null = null
      if (imageUrl) {
        const id = source?.startsWith(BLOG_IMAGE_SCHEME) ? source.slice(BLOG_IMAGE_SCHEME.length) : ''
        url = IMAGE_ID.test(id) ? imageUrl(id) : null
      } else {
        url = resolveBlogImage(source, postId)
      }
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
