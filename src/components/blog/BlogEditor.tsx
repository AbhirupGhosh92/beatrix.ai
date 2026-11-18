'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, ImagePlus, RefreshCw, Save, Trash2 } from 'lucide-react'
import type { BlogEditorConfig } from '../../data/blogConfig.ts'
import type { BlogImage, BlogPost } from '../../lib/blogTypes.ts'
import { BLOG_IMAGE_SCHEME } from '../../lib/blogTypes.ts'
import type { ApiError } from '../../store/api.ts'
import { useDeleteBlogPostMutation, useGetBlogPostQuery, useSaveBlogPostMutation, useUploadBlogImageMutation } from '../../store/api.ts'
import { useAppDispatch } from '../../store/hooks.ts'
import { notify } from '../../store/notifications.ts'
import { ErrorState, SkeletonPage } from '../ui/Skeleton.tsx'

// Markdown rendering is only needed on the preview tab: keep it out of the main bundle.
const BlogPreview = dynamic(() => import('./BlogPreview.tsx'), {
  loading: () => <p className="text-muted">Loading preview...</p>,
})

interface Props {
  /** null for a new post. */
  id: string | null
  config: BlogEditorConfig
  /** A new post got its id: open it. */
  onOpen: (id: string) => void
  onClose: () => void
}

export default function BlogEditor({ id, config, onOpen, onClose }: Props) {
  const query = useGetBlogPostQuery(id ?? '', { skip: id === null })
  // Bumped by Reload so the form starts again from the freshly fetched post.
  const [reloadKey, setReloadKey] = useState(0)

  if (id === null) return <BlogForm key="new" post={null} config={config} onOpen={onOpen} onClose={onClose} onReload={() => undefined} />
  if (query.isLoading || query.isFetching) return <SkeletonPage label="Loading the post" />
  if (!query.data) {
    const message = (query.error && 'message' in query.error ? query.error.message : undefined) ?? 'The post could not be loaded.'
    return <ErrorState message={message} onRetry={() => void query.refetch()} />
  }
  return (
    <BlogForm
      key={`${query.data.id}-${reloadKey}`}
      post={query.data}
      config={config}
      onOpen={onOpen}
      onClose={onClose}
      onReload={() => {
        void query.refetch().then(() => setReloadKey((n) => n + 1))
      }}
    />
  )
}

/** Tags typed as text, comma separated: trimmed, lowercased, de-duplicated. */
function parseTags(text: string): string[] {
  const tags = text
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(tags)]
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface FormProps extends Omit<Props, 'id'> {
  post: BlogPost | null
  onReload: () => void
}

function BlogForm({ post, config, onOpen, onClose, onReload }: FormProps) {
  const dispatch = useAppDispatch()
  const [saveBlogPost, { isLoading: saving }] = useSaveBlogPostMutation()
  const [deleteBlogPost, { isLoading: deleting }] = useDeleteBlogPostMutation()
  const [uploadBlogImage, { isLoading: uploading }] = useUploadBlogImageMutation()

  const [title, setTitle] = useState(post?.title ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [tagsText, setTagsText] = useState(post?.tags.join(', ') ?? '')
  const [published, setPublished] = useState(post?.status === 'published')
  const [version, setVersion] = useState(post?.version)
  const [postId, setPostId] = useState(post?.id ?? null)
  const [images, setImages] = useState<BlogImage[]>(post?.images ?? [])
  const [removed, setRemoved] = useState<string[]>([])
  const [conflict, setConflict] = useState(false)
  const [preview, setPreview] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const tags = parseTags(tagsText)
  const bodyBytes = byteLength(body)
  const problems = [
    title.trim() === '' ? 'Add a title.' : null,
    title.length > config.maxTitleLength ? `The title is over ${config.maxTitleLength} characters.` : null,
    bodyBytes > config.maxBodyBytes ? `The text is over ${config.maxBodyBytes} bytes.` : null,
    tags.length > config.maxTagsPerPost ? `Use at most ${config.maxTagsPerPost} tags.` : null,
    tags.some((tag) => tag.length > config.maxTagLength) ? `A tag is over ${config.maxTagLength} characters.` : null,
  ].filter((problem): problem is string => problem !== null)
  const busy = saving || deleting || uploading

  const save = async () => {
    try {
      const saved = await saveBlogPost({
        ...(postId ? { id: postId, version } : {}),
        title: title.trim(),
        body,
        tags,
        status: published ? 'published' : 'draft',
        ...(removed.length > 0 ? { removeImageIds: removed } : {}),
      }).unwrap()
      setConflict(false)
      setVersion(saved.version)
      setImages(saved.images)
      setRemoved([])
      if (!postId) {
        setPostId(saved.id)
        onOpen(saved.id)
      }
    } catch (err) {
      // The error snackbar already told the user; a version conflict also offers Reload.
      if ((err as ApiError | undefined)?.status === 409) setConflict(true)
    }
  }

  const remove = async () => {
    if (!postId) return
    try {
      await deleteBlogPost(postId).unwrap()
      onClose()
    } catch {
      // Already reported by the error snackbar.
    }
  }

  const insertImage = (image: BlogImage) => {
    const markdown = `![${image.name.replace(/[[\]]/g, '')}](${BLOG_IMAGE_SCHEME}${image.id})`
    const el = bodyRef.current
    const at = el ? el.selectionStart : body.length
    const end = el ? el.selectionEnd : body.length
    setBody(`${body.slice(0, at)}${markdown}${body.slice(end)}`)
    setPreview(false)
  }

  const upload = async (file: File) => {
    if (!postId) return
    if (file.size > config.maxImageBytes) {
      dispatch(notify('error', `That image is over the ${Math.floor(config.maxImageBytes / 1024)} KB limit.`))
      return
    }
    if (images.length >= config.maxImagesPerPost) {
      dispatch(notify('error', `A post holds at most ${config.maxImagesPerPost} images.`))
      return
    }
    try {
      const image = await uploadBlogImage({ postId, name: file.name, dataBase64: await readBase64(file) }).unwrap()
      setImages((current) => [...current, image])
      insertImage(image)
    } catch {
      // Already reported by the error snackbar (or the file could not be read).
    }
  }

  const visibleImages = images.filter((image) => !removed.includes(image.id))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="button-secondary flex items-center gap-2" onClick={onClose}>
          <ArrowLeft size={16} aria-hidden="true" /> All posts
        </button>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="toggle" checked={published} onChange={(event) => setPublished(event.target.checked)} />
          <span className="text-meta-strong">{published ? 'Published' : 'Draft'}</span>
        </label>
      </div>

      {conflict && (
        <div role="alert" className="alert alert-warning">
          <span className="min-w-0 break-words">This post changed elsewhere. Reload to get the latest version (your unsaved edits here are lost).</span>
          <button type="button" className="button-secondary flex items-center gap-2" onClick={onReload}>
            <RefreshCw size={16} aria-hidden="true" /> Reload
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-meta-strong font-semibold">Title</span>
        <input className="input input-bordered w-full" value={title} onChange={(event) => setTitle(event.target.value)} />
        <span className="text-meta">
          {title.length} / {config.maxTitleLength}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-meta-strong font-semibold">Tags</span>
        <input
          className="input input-bordered w-full"
          placeholder="comma, separated"
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
        />
        <span className="text-meta">
          {tags.length} / {config.maxTagsPerPost} tags, up to {config.maxTagLength} characters each
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2" role="group" aria-label="Editor view">
            <button type="button" className={preview ? 'button-secondary' : 'button-primary'} aria-pressed={!preview} onClick={() => setPreview(false)}>
              Write
            </button>
            <button type="button" className={preview ? 'button-primary' : 'button-secondary'} aria-pressed={preview} onClick={() => setPreview(true)}>
              Preview
            </button>
          </div>
          <span className="text-meta">
            {bodyBytes} / {config.maxBodyBytes} bytes
          </span>
        </div>
        {preview ? (
          <div className="surface rounded-box min-h-64 p-4">
            {body.trim() === '' ? <p className="text-muted">Nothing to preview yet.</p> : <BlogPreview body={body} postId={postId} />}
          </div>
        ) : (
          <textarea
            ref={bodyRef}
            className="textarea textarea-bordered min-h-64 w-full font-mono"
            aria-label="Post text in Markdown"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        )}
      </div>

      <div className="surface rounded-box flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-meta-strong font-semibold">
            Images ({visibleImages.length} / {config.maxImagesPerPost})
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void upload(file)
            }}
          />
          <button
            type="button"
            className="button-secondary flex items-center gap-2"
            disabled={busy || !postId}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={16} aria-hidden="true" /> Upload image
          </button>
        </div>
        {!postId && <p className="text-meta">Save the post once to add images.</p>}
        <p className="text-meta">PNG, JPEG, WebP or GIF, up to {Math.floor(config.maxImageBytes / 1024)} KB each.</p>
        {visibleImages.length > 0 && (
          <ul className="flex flex-col gap-2">
            {visibleImages.map((image) => (
              <li key={image.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate">{image.name}</span>
                <span className="flex gap-2">
                  <button type="button" className="button-secondary" onClick={() => insertImage(image)}>
                    Insert
                  </button>
                  <button type="button" className="button-secondary" onClick={() => setRemoved((ids) => [...ids, image.id])}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {removed.length > 0 && <p className="text-meta">Removed images are deleted when you save.</p>}
      </div>

      {problems.length > 0 && (
        <ul className="text-meta" role="status">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="button-primary flex items-center gap-2" disabled={busy || problems.length > 0} onClick={() => void save()}>
          <Save size={16} aria-hidden="true" /> {published ? 'Save and publish' : 'Save draft'}
        </button>
        {postId &&
          (confirmingDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-meta-strong">Delete this post and its images?</span>
              <button type="button" className="button-primary" disabled={busy} onClick={() => void remove()}>
                Delete
              </button>
              <button type="button" className="button-secondary" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="button-secondary flex items-center gap-2" disabled={busy} onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={16} aria-hidden="true" /> Delete
            </button>
          ))}
      </div>
    </div>
  )
}
