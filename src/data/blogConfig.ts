// Types of blog-config.json (cms/blog-config.json in Storage). Missing keys come from
// blog-config.example.json, invalid values are replaced by sanitizeBlogConfig.
import type { Role } from '../lib/access.ts'

export interface BlogConfig {
  /** The on/off switch: while false the authoring routes answer 404 and the home block is hidden. */
  enabled: boolean
  /** Roles that may write posts; the admin always may (forced in by the sanitizer). */
  writeRoles: Role[]
  /** How many published headers the home page shows per request. */
  homeSampleSize: number
  maxTitleLength: number
  /** Characters (Unicode code points) of the visible post text. */
  maxBodyLength: number
  maxTagsPerPost: number
  maxTagLength: number
  maxImageBytes: number
  maxImagesPerPost: number
  /** Characters of an image URL (https) in a post. */
  maxImageUrlLength: number
  /** Safety limit on drafts plus published posts of one author, not a product cap. */
  maxPostsPerAuthor: number
  /** Length of the excerpt stored with a post. */
  excerptLength: number
  /** Copy of the home page block. */
  home: { heading: string; intro: string }
}

/** The values the browser gets from the root layout (BlogConfigProvider / useBlogConfig). */
export interface PublicBlogConfig {
  enabled: boolean
  writeRoles: Role[]
  home: { heading: string; intro: string }
}

/** Numeric ranges enforced by sanitizeBlogConfig; `max` is a hard cap in code. */
export const BLOG_LIMITS = {
  homeSampleSize: { min: 1, max: 12 },
  maxTitleLength: { min: 1, max: 300 },
  maxBodyLength: { min: 1, max: 200_000 },
  maxTagsPerPost: { min: 0, max: 30 },
  maxTagLength: { min: 1, max: 60 },
  maxImageBytes: { min: 1, max: 5_242_880 },
  maxImagesPerPost: { min: 0, max: 50 },
  maxImageUrlLength: { min: 20, max: 8000 },
  maxPostsPerAuthor: { min: 1, max: 2000 },
  excerptLength: { min: 20, max: 500 },
} as const

/** Longest allowed heading or intro text. */
export const BLOG_TEXT_MAX = 160

/** What the editor gets from GET /api/blog/config. */
export interface BlogEditorConfig {
  maxTitleLength: number
  maxBodyLength: number
  maxTagsPerPost: number
  maxTagLength: number
  maxImageBytes: number
  maxImagesPerPost: number
  maxImageUrlLength: number
  /** Whether the caller is an admin (may list every author's posts). */
  isAdmin: boolean
}

/** Header of a published post, the only shape the public endpoint returns. */
export interface BlogHeader {
  id: string
  title: string
  excerpt: string
  tags: string[]
  publishedAt: string
  /** Display name of the author (never an email). */
  authorName: string
}
