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
  /** Absent on posts saved before the rich-text editor: those are Markdown. */
  format: 'markdown' | 'doc'
  /** Always present: the Markdown source, or for a doc post the original kept as a rollback copy. */
  body?: string
  /** The rich-text document, only on doc posts. */
  content?: unknown
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
  /** Legacy Markdown save. A doc post is saved with `content` instead (the server refuses a body save onto it). */
  body?: string
  content?: unknown
  tags: string[]
  status: BlogStatus
  version?: number
  removeImageIds?: string[]
}

/** Image scheme used inside a Markdown body: ![name](blog-image:<imageId>). */
export const BLOG_IMAGE_SCHEME = 'blog-image:'

/** A public comment: no email, only the display name. `mine`/`canRemove` are relative to the viewer. */
export interface BlogComment {
  id: string
  authorName: string
  text: string
  createdAt: string
  mine: boolean
  canRemove: boolean
}

/** GET /api/posts/<id>/engagement. `viewer` is null for an anonymous visitor. */
export interface PostEngagement {
  likeCount: number
  commentCount: number
  comments: BlogComment[]
  hasMore: boolean
  viewer: { liked: boolean; bookmarked: boolean } | null
}

export interface CommentAddResult {
  comment: BlogComment
  commentCount: number
}

export interface BookmarkedPost {
  id: string
  title: string
  excerpt: string
  tags: string[]
  publishedAt: string
  authorName: string
  savedAt: string
}

export interface BlogBookmarks {
  posts: BookmarkedPost[]
}
