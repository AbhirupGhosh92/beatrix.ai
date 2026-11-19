'use client'

import { ArrowLeft, ExternalLink, PenLine } from 'lucide-react'
import { useGetBlogPostQuery } from '../../store/api.ts'
import { ErrorState, SkeletonPage } from '../ui/Skeleton.tsx'
import BlogContent from './BlogContent.tsx'
import ReaderFrame from './ReaderFrame.tsx'

interface Props {
  id: string
  onEdit: () => void
  onClose: () => void
}

// Read-only view of one of the author's own posts (drafts included: the data comes from the
// author-gated /api/blog/<id>, so only its author, or an admin, ever receives it).
export default function BlogView({ id, onEdit, onClose }: Props) {
  const query = useGetBlogPostQuery(id)
  const post = query.data

  if (query.isLoading || (query.isFetching && !post)) return <SkeletonPage label="Loading the post" />
  if (!post) {
    const message = (query.error && 'message' in query.error ? query.error.message : undefined) ?? 'The post could not be loaded.'
    return <ErrorState message={message} onRetry={() => void query.refetch()} />
  }

  return (
    <article className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="button-secondary flex items-center gap-2" onClick={onClose}>
          <ArrowLeft size={16} aria-hidden="true" /> All posts
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {post.status === 'published' && (
            <a href={`/posts/${encodeURIComponent(post.id)}`} className="button-secondary flex items-center gap-2" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} aria-hidden="true" /> Open public page
            </a>
          )}
          <button type="button" className="button-primary flex items-center gap-2" onClick={onEdit}>
            <PenLine size={16} aria-hidden="true" /> Edit
          </button>
        </div>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-2xl font-semibold">{post.title || 'Untitled'}</h1>
          <span className="blog-tag">{post.status === 'published' ? 'Published' : 'Draft'}</span>
        </div>
        {post.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Tags">
            {post.tags.map((tag) => (
              <li key={tag} className="blog-tag">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      <ReaderFrame>
        <div className="surface rounded-box p-4">
          <BlogContent
            format={post.format === 'doc' ? 'doc' : 'markdown'}
            body={post.body}
            content={post.content}
            imageUrl={(imageId: string) => `/api/blog/${encodeURIComponent(post.id)}/images/${imageId}`}
          />
        </div>
      </ReaderFrame>
    </article>
  )
}
