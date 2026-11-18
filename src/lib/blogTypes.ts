// Browser-side copies of the blog response types (the originals live in the server-only
// src/middleware/blogService.ts, which the browser must never import). Keep them in step.
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
  body: string
  images: BlogImage[]
  version: number
}

export interface BlogList {
  posts: BlogPostSummary[]
  canSeeAll: boolean
}

/** What the editor sends on save (a create has no `id` and no `version`). */
export interface BlogSaveArg {
  id?: string
  title: string
  body: string
  tags: string[]
  status: BlogStatus
  version?: number
  removeImageIds?: string[]
}

/** Image scheme used inside a Markdown body: ![name](blog-image:<imageId>). */
export const BLOG_IMAGE_SCHEME = 'blog-image:'
