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
  return headers.map(({ id, title, excerpt, tags, publishedAt }) => ({ id, title, excerpt, tags, publishedAt }))
}
