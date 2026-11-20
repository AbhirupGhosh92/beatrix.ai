'use client'

import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import { useGetBookmarksQuery, useToggleBookmarkMutation } from '../../store/api.ts'
import { ErrorState, SkeletonPage } from '../ui/Skeleton.tsx'

/** The signed-in user's saved posts, newest saved first. */
export default function BookmarksPage() {
  const { data, isLoading, isError, refetch } = useGetBookmarksQuery(undefined, { refetchOnMountOrArgChange: true })
  const [toggleBookmark, { isLoading: removing }] = useToggleBookmarkMutation()

  const unsave = async (id: string) => {
    try {
      await toggleBookmark(id).unwrap()
    } catch {
      // Already reported by the notification listener.
    }
  }

  if (isLoading) return <SkeletonPage label="Loading saved posts" />

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 py-10 sm:px-6">
      <h1 className="heading-display mb-6 text-2xl sm:text-3xl">Saved posts</h1>
      {isError || !data ? (
        <ErrorState message="Could not load your saved posts." onRetry={() => void refetch()} />
      ) : data.posts.length === 0 ? (
        <p className="text-muted">You have not saved any posts yet. Use the save button under a post to keep it here.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.posts.map((post) => (
            <li key={post.id}>
              <article className="blog-card flex h-full flex-col gap-3">
                <p className="text-meta">
                  {post.authorName} ·{' '}
                  <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString()}</time>
                </p>
                <h2 className="break-words text-lg font-semibold">
                  <Link href={`/posts/${post.id}`} className="blog-card-link">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-muted break-words">{post.excerpt}</p>
                <div className="mt-auto flex items-end justify-between gap-2">
                  <ul className="flex flex-wrap gap-1" aria-label="Tags">
                    {post.tags.map((tag) => (
                      <li key={tag} className="blog-tag">
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="button-secondary bookmark-remove"
                    aria-label={`Remove ${post.title} from saved posts`}
                    disabled={removing}
                    onClick={() => void unsave(post.id)}
                  >
                    <Bookmark size={18} fill="currentColor" aria-hidden="true" />
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
