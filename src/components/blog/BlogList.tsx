'use client'

import { Eye, FilePlus, PenLine } from 'lucide-react'
import type { BlogPostSummary } from '../../lib/blogTypes.ts'

interface Props {
  posts: BlogPostSummary[]
  /** The caller may list every author's posts (admin). */
  canSeeAll: boolean
  showAll: boolean
  onToggleAll: (all: boolean) => void
  onView: (id: string) => void
  onOpen: (id: string) => void
  onNew: () => void
}

export default function BlogList({ posts, canSeeAll, showAll, onToggleAll, onView, onOpen, onNew }: Props) {
  const sorted = [...posts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="button-primary flex items-center gap-2" onClick={onNew}>
          <FilePlus size={16} aria-hidden="true" /> New post
        </button>
        {canSeeAll && (
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="toggle" checked={showAll} onChange={(event) => onToggleAll(event.target.checked)} />
            <span className="text-meta-strong">Show posts of all authors</span>
          </label>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted">No posts yet. Write your first one with New post.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((post) => (
            <li key={post.id} className="surface rounded-box flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate font-semibold">{post.title || 'Untitled'}</p>
                  <span className="blog-tag">{post.status === 'published' ? 'Published' : 'Draft'}</span>
                </div>
                <p className="text-meta">
                  Updated {post.updatedAt ? new Date(post.updatedAt).toLocaleString() : '-'}
                  {showAll && post.authorEmail && <span className="break-all"> by {post.authorEmail}</span>}
                </p>
                {post.tags.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tags">
                    {post.tags.map((tag) => (
                      <li key={tag} className="blog-tag">
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className="button-secondary flex items-center gap-2" onClick={() => onView(post.id)}>
                  <Eye size={16} aria-hidden="true" /> View
                </button>
                <button type="button" className="button-secondary flex items-center gap-2" onClick={() => onOpen(post.id)}>
                  <PenLine size={16} aria-hidden="true" /> Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
