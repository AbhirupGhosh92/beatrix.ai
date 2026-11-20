'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Editor, JSONContent } from '@tiptap/react'
import { ArrowLeft, ImagePlus, RefreshCw, Save, Trash2 } from 'lucide-react'
import type { BlogEditorConfig } from '../../data/blogConfig.ts'
import { charCount, docText, validateDoc } from '../../lib/blogDoc.ts'
import type { BlogDoc } from '../../lib/blogDoc.ts'
import { prepareLegacyMarkdown, scanLegacyMarkdown } from '../../lib/blogMarkdownImport.ts'
import type { BlogImage, BlogPost, BlogSaveArg } from '../../lib/blogTypes.ts'
import type { ApiError } from '../../store/api.ts'
import { useDeleteBlogPostMutation, useGetBlogPostQuery, useSaveBlogPostMutation, useUploadBlogImageMutation } from '../../store/api.ts'
import { useAppDispatch } from '../../store/hooks.ts'
import { notify } from '../../store/notifications.ts'
import { ErrorState, SkeletonPage } from '../ui/Skeleton.tsx'
import CharCounter from './CharCounter.tsx'
import type { EditorInitial } from './RichEditor.tsx'

// The rich-text editor (Tiptap) is large: it is loaded here only, so no other page downloads it.
const RichEditor = dynamic(() => import('./RichEditor.tsx'), {
  ssr: false,
  loading: () => <p className="text-muted">Loading the editor...</p>,
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
  // The id of the post this form created with its first save: while `id` is that id the same form
  // stays mounted (same key), so the editor keeps its cursor and unsaved typing.
  const [created, setCreated] = useState<string | null>(null)
  const keepForm = id === null || id === created
  const query = useGetBlogPostQuery(id ?? '', { skip: keepForm, refetchOnMountOrArgChange: true })
  // Bumped by Reload so the form starts again from the freshly fetched post.
  const [reloadKey, setReloadKey] = useState(0)

  if (keepForm) {
    return (
      <BlogForm
        key="new"
        post={null}
        config={config}
        onOpen={(openedId) => {
          setCreated(openedId)
          onOpen(openedId)
        }}
        onClose={onClose}
        onReload={() => {
          // Leaves the kept form: the post is fetched and the form starts again from it.
          setCreated(null)
          setReloadKey((n) => n + 1)
        }}
      />
    )
  }
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

/** The tag being typed: the text after the last comma. */
function typedTag(text: string): string {
  return text.slice(text.lastIndexOf(',') + 1).trim()
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
  }
  return `${Math.floor(bytes / 1024)} KB`
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function initialContent(post: BlogPost | null): EditorInitial {
  if (!post) return { kind: 'empty' }
  if (post.format === 'doc' && post.content && typeof post.content === 'object') return { kind: 'doc', doc: post.content as JSONContent }
  return post.body ? { kind: 'markdown', markdown: prepareLegacyMarkdown(post.body) } : { kind: 'empty' }
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
  const [tagsText, setTagsText] = useState(post?.tags.join(', ') ?? '')
  const [published, setPublished] = useState(post?.status === 'published')
  const [version, setVersion] = useState(post?.version)
  const [postId, setPostId] = useState(post?.id ?? null)
  const [images, setImages] = useState<BlogImage[]>(post?.images ?? [])
  const [removed, setRemoved] = useState<string[]>([])
  const [conflict, setConflict] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [doc, setDoc] = useState<JSONContent | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // The title field grows with its text (no inner scrollbar).
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  // Legacy Markdown posts are converted in the editor; the notice says what that cannot keep.
  const initial = useMemo(() => initialContent(post), [post])
  const [converted, setConverted] = useState(initial.kind === 'markdown')
  const losses = useMemo(() => scanLegacyMarkdown(post?.body ?? ''), [post])

  const bodyMax = config.maxBodyLength

  const checked = useMemo((): { doc: BlogDoc } | { error: string } | null => {
    if (!doc) return null
    try {
      return { doc: validateDoc(doc) }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'The post content is not valid.' }
    }
  }, [doc])
  const validDoc = checked && 'doc' in checked ? checked.doc : null

  const tags = parseTags(tagsText)
  const titleChars = charCount(title)
  const bodyChars = validDoc ? charCount(docText(validDoc)) : 0
  const tagTyped = charCount(typedTag(tagsText))
  const problems = [
    title.trim() === '' ? 'Add a title.' : null,
    titleChars > config.maxTitleLength ? `The title is over the limit of ${config.maxTitleLength} characters.` : null,
    bodyChars > bodyMax ? `The text is over the limit of ${bodyMax} characters.` : null,
    tags.length > config.maxTagsPerPost ? `Use at most ${config.maxTagsPerPost} tags.` : null,
    tags.some((tag) => charCount(tag) > config.maxTagLength) ? `A tag is over the limit of ${config.maxTagLength} characters.` : null,
    checked && 'error' in checked ? checked.error : null,
  ].filter((problem): problem is string => problem !== null)
  const busy = saving || deleting || uploading

  /** Saves the post; true when it was stored. `asDraft` saves as a draft whatever the toggle says. */
  const save = async (asDraft = false): Promise<boolean> => {
    if (!validDoc) return false
    // A rich post is always saved as a document, never with `body` (the server keeps a legacy post's
    // original Markdown and refuses a body save on a document post).
    const arg = {
      ...(postId ? { id: postId, version } : {}),
      title: title.trim(),
      content: validDoc,
      tags,
      status: (published && !asDraft ? 'published' : 'draft') as BlogSaveArg['status'],
      ...(removed.length > 0 ? { removeImageIds: removed } : {}),
    }
    try {
      const saved = await saveBlogPost(arg).unwrap()
      setConflict(false)
      setVersion(saved.version)
      setImages(saved.images)
      setRemoved([])
      setConverted(false)
      if (!postId) {
        setPostId(saved.id)
        onOpen(saved.id)
      }
      return true
    } catch (err) {
      // The error snackbar already told the user; a version conflict also offers Reload.
      if ((err as ApiError | undefined)?.status === 409) setConflict(true)
      return false
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
    const alt = Array.from(image.name.replace(/\.[^.]*$/, '')).slice(0, 500).join('')
    editor
      ?.chain()
      .focus()
      .insertContent({ type: 'image', attrs: { imageId: image.id, alt } })
      .run()
  }

  /** Removes an image from the post and every place the text shows it. */
  const removeImage = (imageId: string) => {
    setRemoved((ids) => [...ids, imageId])
    if (!editor) return
    const positions: { from: number; to: number }[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.imageId === imageId) positions.push({ from: pos, to: pos + node.nodeSize })
    })
    const chain = editor.chain()
    for (const range of positions.reverse()) chain.deleteRange(range)
    chain.run()
  }

  const upload = async (file: File) => {
    if (!postId) return
    if (file.size > config.maxImageBytes) {
      dispatch(notify('error', `That image is over the ${formatBytes(config.maxImageBytes)} limit.`))
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
  const reportError = useCallback((message: string) => dispatch(notify('error', message)), [dispatch])
  const maxImageUrlLength = config.maxImageUrlLength

  /** The Upload control (toolbar and Images panel). A never-saved post is saved as a draft first. */
  const requestUpload = async () => {
    if (busy) return
    if (visibleImages.length >= config.maxImagesPerPost) {
      dispatch(notify('error', `A post holds at most ${config.maxImagesPerPost} images.`))
      return
    }
    if (postId) {
      fileRef.current?.click()
      return
    }
    // Never saved: the form's own checks first, so nothing is saved and no picker opens when they fail.
    if (problems.length > 0 || !validDoc) {
      dispatch(notify('error', problems.length > 0 ? problems.join(' ') : 'The text is not ready yet.'))
      return
    }
    setPublished(false)
    if (!(await save(true))) return
    // The click's activation may be spent by the save: showPicker can refuse, then the next click opens it.
    try {
      fileRef.current?.showPicker()
    } catch {
      dispatch(notify('info', 'Draft saved. Choose the image again.'))
    }
  }

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

      <div className="editor-canvas">
        <label className="flex flex-col gap-1">
          <span className="sr-only">Title</span>
          <textarea
            ref={titleRef}
            className="editor-title"
            rows={1}
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value.replace(/[\r\n]+/g, ' '))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault()
            }}
          />
          <CharCounter label="Title length" count={titleChars} max={config.maxTitleLength} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-meta-strong font-semibold">Tags</span>
        <input
          className="input input-bordered w-full"
          placeholder="comma, separated"
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
        />
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <CharCounter label="Tags in this post" count={tags.length} max={config.maxTagsPerPost} unit="tags" />
          <CharCounter label="Tag being typed" count={tagTyped} max={config.maxTagLength} />
        </span>
      </label>

      {converted && (
        <div role="status" className="alert alert-info">
          <span className="min-w-0 break-words">
            This post was written in Markdown and is converted to the rich-text editor. Saving stores the converted version (the original text is kept as a
            backup).
            {losses.length > 0 && ` These parts cannot be kept as they are (tables become plain lines; task boxes, HTML and remote images are removed): ${losses.join(', ')}.`}
          </span>
        </div>
      )}

      <div className="editor-canvas flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CharCounter label="Text length" count={bodyChars} max={bodyMax} />
        </div>
        <RichEditor
          initial={initial}
          postId={postId}
          busy={busy}
          maxImageUrlLength={maxImageUrlLength}
          onPickImage={() => void requestUpload()}
          onDoc={setDoc}
          onEditor={setEditor}
          onError={reportError}
        />
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
          <button type="button" className="button-secondary flex items-center gap-2" disabled={busy} onClick={() => void requestUpload()}>
            <ImagePlus size={16} aria-hidden="true" /> Upload image
          </button>
        </div>
        {!postId && <p className="text-meta">Uploading an image on a new post saves it as a draft first.</p>}
        <p className="text-meta">PNG, JPEG, WebP or GIF, up to {formatBytes(config.maxImageBytes)} each.</p>
        {visibleImages.length > 0 && (
          <ul className="flex flex-col gap-2">
            {visibleImages.map((image) => (
              <li key={image.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate">{image.name}</span>
                <span className="flex gap-2">
                  <button type="button" className="button-secondary" onClick={() => insertImage(image)}>
                    Insert
                  </button>
                  <button type="button" className="button-secondary" onClick={() => removeImage(image.id)}>
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
        <button
          type="button"
          className="button-primary flex items-center gap-2"
          disabled={busy || problems.length > 0 || !validDoc}
          onClick={() => void save()}
        >
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
