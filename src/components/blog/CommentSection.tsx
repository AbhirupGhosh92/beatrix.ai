'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { BlogComment, PostEngagement } from '../../lib/blogTypes.ts'
import { useAddCommentMutation, useLazyGetOlderCommentsQuery, useRemoveCommentMutation } from '../../store/api.ts'
import { useBlogConfig } from '../layout/BlogConfigProvider.tsx'

/** Default of `maxCommentLength` in blog-config.json; the server enforces the real value. */
const DEFAULT_MAX_COMMENT = 1000

const countChars = (text: string) => Array.from(text).length

/** Flat, plain-text comments newest first, with a composer for signed-in users. */
export default function CommentSection({
  postId,
  engagement,
  signedIn,
}: {
  postId: string
  engagement: PostEngagement
  signedIn: boolean
}) {
  // The public config may carry maxCommentLength; fall back to the documented default otherwise.
  const config = useBlogConfig() as { maxCommentLength?: number }
  const max = typeof config.maxCommentLength === 'number' ? config.maxCommentLength : DEFAULT_MAX_COMMENT
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [older, setOlder] = useState<BlogComment[]>([])
  const [olderDone, setOlderDone] = useState(false)
  const [addComment, add] = useAddCommentMutation()
  const [removeComment, remove] = useRemoveCommentMutation()
  const [fetchOlder, { isFetching: loadingOlder }] = useLazyGetOlderCommentsQuery()

  const length = countChars(text)
  const hasMore = engagement.hasMore && !olderDone
  const shown = new Set(engagement.comments.map((c) => c.id))
  const comments = [...engagement.comments, ...older.filter((c) => !shown.has(c.id))]

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (text.trim().length === 0) {
      setError('Write a comment first.')
      return
    }
    if (length > max) {
      setError(`A comment can be at most ${max} characters.`)
      return
    }
    setError(null)
    try {
      await addComment({ id: postId, text }).unwrap()
      setText('')
    } catch {
      // Already reported by the notification listener; keep the text so nothing is lost.
    }
  }

  const confirmRemove = async (commentId: string) => {
    try {
      await removeComment({ id: postId, commentId }).unwrap()
      setOlder((list) => list.filter((c) => c.id !== commentId))
    } catch {
      // Already reported.
    } finally {
      setConfirming(null)
    }
  }

  const loadOlder = async () => {
    const last = comments[comments.length - 1]
    if (!last) return
    try {
      const page = await fetchOlder({ id: postId, before: last.createdAt }).unwrap()
      setOlder((list) => [...list, ...page.comments])
      if (!page.hasMore) setOlderDone(true)
    } catch {
      // Already reported.
    }
  }

  return (
    <div id="comments" className="comments">
      <h2 className="text-lg font-semibold">Comments ({engagement.commentCount})</h2>

      {signedIn && (
        <form onSubmit={(e) => void submit(e)} className="comment-form" noValidate>
          <label htmlFor="comment-text" className="sr-only">
            Write a comment
          </label>
          <textarea
            id="comment-text"
            className="textarea w-full"
            rows={3}
            value={text}
            placeholder="Write a comment"
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setText(e.target.value)
              if (error) setError(null)
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={length > max ? 'text-error text-sm' : 'text-meta'} aria-live="polite">
              {length} / {max} characters
            </span>
            <button type="submit" className="button-primary" disabled={add.isLoading}>
              Post comment
            </button>
          </div>
          {error && (
            <p role="alert" className="text-error text-sm">
              {error}
            </p>
          )}
        </form>
      )}

      {comments.length === 0 ? (
        <p className="text-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => (
            <li key={comment.id} className="comment">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-meta-strong min-w-0 break-words">
                  {comment.authorName} ·{' '}
                  <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString()}</time>
                </p>
                {comment.canRemove &&
                  (confirming === comment.id ? (
                    <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm removal">
                      <span className="text-meta">Remove this comment?</span>
                      <button
                        type="button"
                        className="button-accent"
                        disabled={remove.isLoading}
                        onClick={() => void confirmRemove(comment.id)}
                      >
                        Remove
                      </button>
                      <button type="button" className="button-secondary" onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="button-secondary"
                      aria-label={`Remove comment by ${comment.authorName}`}
                      onClick={() => setConfirming(comment.id)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  ))}
              </div>
              <p className="comment-text">{comment.text}</p>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button type="button" className="button-secondary self-start" disabled={loadingOlder} onClick={() => void loadOlder()}>
          Load older comments
        </button>
      )}
    </div>
  )
}
