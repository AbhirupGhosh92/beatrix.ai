// The `blog` Cloud Function wraps its answers ({ post }, { image, images }, { headers }); the site's
// API returns the flat shapes the browser types describe. These pure helpers unwrap AND check the
// shape, so a contract mismatch throws loudly instead of silently producing undefined fields or an
// empty home block. scripts/check-blog-contract.mjs runs them against the real function.
import type { BlogHeader } from '../data/blogConfig.ts'

type Wrapped = Record<string, unknown>

function field(response: unknown, key: string, label: string): unknown {
  if (typeof response !== 'object' || response === null || !(key in response)) {
    throw new Error(`blog function: "${label}" response has no "${key}" field`)
  }
  return (response as Wrapped)[key]
}

export function unwrapPost<T>(response: unknown): T {
  const post = field(response, 'post', 'get/save')
  if (typeof post !== 'object' || post === null || typeof (post as Wrapped).id !== 'string') {
    throw new Error('blog function: "post" is not a post')
  }
  return post as T
}

export function unwrapImage<T>(response: unknown): T {
  const image = field(response, 'image', 'imageUpload')
  if (typeof image !== 'object' || image === null || typeof (image as Wrapped).id !== 'string') {
    throw new Error('blog function: "image" is not an image')
  }
  return image as T
}

export function unwrapHeaders(response: unknown): BlogHeader[] {
  const headers = field(response, 'headers', 'headers')
  if (!Array.isArray(headers)) throw new Error('blog function: "headers" is not a list')
  return headers.map(({ id, title, excerpt, tags, publishedAt, authorName }) => ({
    id,
    title,
    excerpt,
    tags,
    publishedAt,
    authorName,
  }))
}

// The public post, copied field by field so nothing but these ever reaches the page (never an author email).
export interface PublicPostImage {
  id: string
  name: string
  contentType: string
}

export interface PublicPost {
  id: string
  title: string
  excerpt: string
  tags: string[]
  publishedAt: string
  authorName: string
  format: 'markdown' | 'doc'
  body?: string
  content?: unknown
  images: PublicPostImage[]
}

export function unwrapPublicPost(response: unknown): PublicPost {
  const post = field(response, 'post', 'publicGet')
  if (typeof post !== 'object' || post === null || typeof (post as Wrapped).id !== 'string') {
    throw new Error('blog function: "post" is not a post')
  }
  const p = post as Wrapped
  const format = p.format === 'doc' ? 'doc' : 'markdown'
  if (!Array.isArray(p.images)) throw new Error('blog function: "images" is not a list')
  const out: PublicPost = {
    id: p.id as string,
    title: p.title as string,
    excerpt: p.excerpt as string,
    tags: p.tags as string[],
    publishedAt: p.publishedAt as string,
    authorName: p.authorName as string,
    format,
    images: (p.images as Wrapped[]).map(({ id, name, contentType }) => ({
      id: id as string,
      name: name as string,
      contentType: contentType as string,
    })),
  }
  if (format === 'doc') out.content = p.content
  else out.body = p.body as string
  return out
}
