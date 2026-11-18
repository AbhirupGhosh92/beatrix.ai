// The blog. Every call goes to the single private `blog` Cloud Function, which dispatches on
// `action`. The browser's session cookie is forwarded (the function verifies it and derives the
// author itself); this layer adds the config limits and writeRoles. Shared response types live here
// (src/lib/blogTypes.ts belongs to the editor group).
import 'server-only'
import type { BlogConfig, BlogHeader } from '../data/blogConfig.ts'
import { unwrapHeaders, unwrapImage, unwrapPost, unwrapPublicPost } from '../lib/blogResponses.ts'
import type { PublicPost } from '../lib/blogResponses.ts'
import { CloudFunctionError, callCloudFunction } from './cloudFunctions.ts'
import { getBlogConfig } from './blogConfigService.ts'

export type { BlogHeader, PublicPost }

export type BlogStatus = 'draft' | 'published'

export interface BlogImage {
  id: string
  contentType: string
  bytes: number
  name: string
}

export interface BlogPostSummary {
  id: string
  title: string
  excerpt: string
  tags: string[]
  status: BlogStatus
  updatedAt: string
  publishedAt: string | null
  /** Only in the admin's all-authors view. */
  authorEmail?: string
}

export interface BlogPost extends BlogPostSummary {
  format: 'markdown' | 'doc'
  body?: string
  content?: unknown
  images: BlogImage[]
  version: number
}

/** The fields the client may send on save; anything else is never forwarded. */
export interface BlogSaveInput {
  id?: unknown
  title: unknown
  body?: unknown
  content?: unknown
  tags: unknown
  status: unknown
  version?: unknown
  removeImageIds?: unknown
}

function limits(config: BlogConfig) {
  return {
    writeRoles: config.writeRoles,
    maxTitleLength: config.maxTitleLength,
    maxBodyLength: config.maxBodyLength,
    maxTagsPerPost: config.maxTagsPerPost,
    maxTagLength: config.maxTagLength,
    maxImageBytes: config.maxImageBytes,
    maxImagesPerPost: config.maxImagesPerPost,
    maxPostsPerAuthor: config.maxPostsPerAuthor,
    excerptLength: config.excerptLength,
  }
}

async function call<Response>(action: string, cookie: string | null, fields: object = {}) {
  const config = await getBlogConfig()
  return callCloudFunction<Response>('blog', {
    action,
    ...(cookie ? { cookie } : {}),
    config: limits(config),
    ...fields,
  })
}

export const listBlogPosts = (cookie: string, scope: unknown) =>
  call<{ posts: BlogPostSummary[]; canSeeAll: boolean }>('list', cookie, { scope: scope === 'all' ? 'all' : undefined })

export const getBlogPost = async (cookie: string, id: string) =>
  unwrapPost<BlogPost>(await call<unknown>('get', cookie, { id }))

export const saveBlogPost = async (cookie: string, input: BlogSaveInput) => {
  const { id, title, body, content, tags, status, version, removeImageIds } = input
  return unwrapPost<BlogPost>(
    await call<unknown>('save', cookie, { id, title, body, content, tags, status, version, removeImageIds }),
  )
}

export const deleteBlogPost = (cookie: string, id: string) => call<{ success: boolean }>('delete', cookie, { id })

export const uploadBlogImage = async (cookie: string, id: string, input: { name: unknown; dataBase64: unknown }) =>
  unwrapImage<BlogImage>(await call<unknown>('imageUpload', cookie, { id, name: input.name, dataBase64: input.dataBase64 }))

export const getBlogImage = (cookie: string, id: string, imageId: string) =>
  call<{ contentType: string; dataBase64: string }>('imageGet', cookie, { id, imageId })

// Public pool of published headers: kept 30 s in memory (a post unpublished or deleted can still show
// for up to that long), sampled at random per request. Never holds anything beyond the header fields.
const POOL_TTL_MS = 30_000
let pool: { at: number; headers: BlogHeader[] } | undefined
let poolInFlight: Promise<BlogHeader[]> | undefined

async function loadPool(): Promise<BlogHeader[]> {
  if (pool && Date.now() - pool.at < POOL_TTL_MS) return pool.headers
  poolInFlight ??= call<unknown>('headers', null)
    .then((response) => {
      // unwrapHeaders copies only the public fields, whatever the function returned.
      const headers = unwrapHeaders(response)
      pool = { at: Date.now(), headers }
      return headers
    })
    .finally(() => {
      poolInFlight = undefined
    })
  return poolInFlight
}

/** `count` random published headers (Fisher-Yates over a copy of the pool). */
export async function sampleBlogHeaders(count: number): Promise<BlogHeader[]> {
  const copy = [...(await loadPool())]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

// Public post pages: a published post is kept 30 s in memory (a post unpublished or deleted can still be
// readable for up to that long, like the home pool). Only published posts are ever stored; a draft or
// unknown id is a 404 from the function and is not cached.
const POST_TTL_MS = 30_000
const POST_CACHE_MAX = 50
const postCache = new Map<string, { at: number; post: PublicPost }>()
const PUBLIC_ID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** The published post, or null when it is missing, a draft, deleted or the id is malformed. */
export async function getPublicBlogPost(id: string): Promise<PublicPost | null> {
  if (!PUBLIC_ID.test(id)) return null
  const hit = postCache.get(id)
  if (hit && Date.now() - hit.at < POST_TTL_MS) return hit.post
  postCache.delete(id)
  try {
    const post = unwrapPublicPost(await call<unknown>('publicGet', null, { id }))
    for (const [key, entry] of postCache) {
      if (Date.now() - entry.at >= POST_TTL_MS) postCache.delete(key)
    }
    while (postCache.size >= POST_CACHE_MAX) postCache.delete(postCache.keys().next().value as string)
    postCache.set(id, { at: Date.now(), post })
    return post
  } catch (err) {
    if (err instanceof CloudFunctionError && err.status === 404) return null
    throw err
  }
}

/** The bytes of an image of a published post, or null when the post or image is not public. */
export async function getPublicBlogImage(id: string, imageId: string) {
  if (!PUBLIC_ID.test(id)) return null
  try {
    return await call<{ contentType: string; name: string; dataBase64: string }>('publicImageGet', null, { id, imageId })
  } catch (err) {
    if (err instanceof CloudFunctionError && err.status === 404) return null
    throw err
  }
}
