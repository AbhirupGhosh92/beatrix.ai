'use client'

import Link from 'next/link'
import { Bookmark, Heart, MessageSquare } from 'lucide-react'
import {
  useGetPostEngagementQuery,
  useGetSessionRoleQuery,
  useToggleBookmarkMutation,
  useToggleLikeMutation,
} from '../../store/api.ts'
import { useProfile } from '../layout/ProfileProvider.tsx'
import GoogleSignIn from '../ui/GoogleSignIn.tsx'
import { SkeletonText } from '../ui/Skeleton.tsx'
import CommentSection from './CommentSection.tsx'

/**
 * Likes, bookmark and comments under a published post. Counts and comments are public; the controls
 * need a session (anonymous visitors get a sign-in prompt). Failures reach the user through the
 * store's notification listener, so the handlers only ignore the already-reported error.
 */
export default function PostEngagement({ postId }: { postId: string }) {
  const { upcomingProjects } = useProfile()
  const lock = upcomingProjects.lock
  const { data: role } = useGetSessionRoleQuery()
  const { data, isLoading, isError, refetch } = useGetPostEngagementQuery(postId, { refetchOnMountOrArgChange: true })
  const [toggleLike, like] = useToggleLikeMutation()
  const [toggleBookmark, bookmark] = useToggleBookmarkMutation()

  if (isLoading) {
    return (
      <section className="engagement" aria-label="Loading likes and comments">
        <SkeletonText lines={2} />
      </section>
    )
  }
  if (isError || !data) {
    return (
      <section className="engagement">
        <button type="button" className="button-secondary self-start" onClick={() => void refetch()}>
          Could not load likes and comments. Retry
        </button>
      </section>
    )
  }

  const signedIn = Boolean(role) && data.viewer !== null
  const liked = data.viewer?.liked ?? false
  const bookmarked = data.viewer?.bookmarked ?? false

  const run = async (action: () => { unwrap: () => Promise<unknown> }) => {
    try {
      await action().unwrap()
    } catch {
      // Already reported by the notification listener.
    }
  }

  return (
    <section className="engagement" aria-label="Likes, saves and comments">
      <div className="engagement-bar">
        <div className="flex items-center gap-2">
          {signedIn ? (
            <button
              type="button"
              className="button-secondary engagement-action"
              aria-pressed={liked}
              aria-label={liked ? 'Remove your like' : 'Like this post'}
              disabled={like.isLoading}
              onClick={() => void run(() => toggleLike(postId))}
            >
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
              <span>{data.likeCount}</span>
            </button>
          ) : (
            <span className="engagement-count" aria-label={`${data.likeCount} likes`}>
              <Heart size={18} aria-hidden="true" />
              <span>{data.likeCount}</span>
            </span>
          )}
          <a href="#comments" className="engagement-count" aria-label={`${data.commentCount} comments`}>
            <MessageSquare size={18} aria-hidden="true" />
            <span>{data.commentCount}</span>
          </a>
        </div>
        {signedIn && (
          <div className="flex items-center gap-2">
            <Link href="/bookmarks" className="text-meta hover-subtle">
              Saved posts
            </Link>
            <button
              type="button"
              className="button-secondary engagement-action"
              aria-pressed={bookmarked}
              aria-label={bookmarked ? 'Remove from saved posts' : 'Save this post'}
              disabled={bookmark.isLoading}
              onClick={() => void run(() => toggleBookmark(postId))}
            >
              <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {!signedIn && (
        <div className="engagement-signin">
          <p className="text-muted">Sign in to like, save or comment</p>
          <GoogleSignIn
            signInLabel={lock.signInLabel}
            signingInLabel={lock.signingInLabel}
            restrictedError={lock.restrictedError}
            unknownEmail={lock.unknownEmail}
            failedError={lock.failedError}
          />
        </div>
      )}

      <CommentSection postId={postId} engagement={data} signedIn={signedIn} />
    </section>
  )
}
