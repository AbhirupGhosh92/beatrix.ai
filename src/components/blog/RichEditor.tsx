'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor, JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Markdown } from '@tiptap/markdown'
import { BLOG_IMAGE_SCHEME } from '../../lib/blogTypes.ts'
import EditorToolbar from './EditorToolbar.tsx'

// The rich-text editor (Tiptap). Loaded only by BlogEditor through next/dynamic, so the public pages
// and the home page never download it. Its schema is exactly the closed document in
// src/lib/blogDoc.ts: the server rejects anything else, so every attribute outside that list is
// removed here (Link keeps only `href`, Image keeps only `imageId` and `alt`).

const IMAGE_ID = /^[A-Za-z0-9_-]{1,100}$/

const BlogLink = Link.extend({
  addAttributes() {
    return { href: { default: null } }
  },
})

const BlogImage = Image.extend<{ inline: boolean; allowBase64: boolean; HTMLAttributes: Record<string, unknown>; resize: false; postId: string | null }>({
  addOptions() {
    return { inline: false, allowBase64: false, HTMLAttributes: {}, resize: false, postId: null }
  },
  addAttributes() {
    return {
      imageId: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-image-id') },
      alt: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'img[data-image-id]' }]
  },
  renderHTML({ node }) {
    const postId = this.options.postId
    const imageId = String(node.attrs.imageId ?? '')
    return [
      'img',
      {
        ...(postId ? { src: `/api/blog/${encodeURIComponent(postId)}/images/${imageId}` } : {}),
        alt: String(node.attrs.alt ?? ''),
        'data-image-id': imageId,
        loading: 'lazy',
      },
    ]
  },
  addInputRules() {
    return []
  },
  // Legacy Markdown: `![name](blog-image:<id>)` becomes an image node; any other source is dropped.
  parseMarkdown: (token, helpers) => {
    const href = String(token.href ?? '')
    const id = href.startsWith(BLOG_IMAGE_SCHEME) ? href.slice(BLOG_IMAGE_SCHEME.length) : ''
    if (!IMAGE_ID.test(id)) return []
    return helpers.createNode('image', { imageId: id, alt: token.text ? String(token.text) : null })
  },
})

export type EditorInitial = { kind: 'empty' } | { kind: 'doc'; doc: JSONContent } | { kind: 'markdown'; markdown: string }

interface Props {
  initial: EditorInitial
  /** The post the images belong to (null until it is saved once). */
  postId: string | null
  canUpload: boolean
  uploading: boolean
  onPickImage: () => void
  /** Every change, as the editor's document JSON (validated by the caller before saving). */
  onDoc: (doc: JSONContent) => void
  /** The live editor, so the caller can insert an uploaded image. */
  onEditor: (editor: Editor | null) => void
  onError: (message: string) => void
}

export default function RichEditor({ initial, postId, canUpload, uploading, onPickImage, onDoc, onEditor, onError }: Props) {
  const onDocRef = useRef(onDoc)
  useEffect(() => {
    onDocRef.current = onDoc
  }, [onDoc])

  // The post id is fixed for this editor's life: saving a new post remounts the editor under its id.
  const [imagePostId] = useState(postId)
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      BlogLink.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer nofollow ugc', target: '_blank' },
      }),
      BlogImage.configure({ postId: imagePostId }),
      Markdown,
    ],
    [imagePostId],
  )

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: initial.kind === 'doc' ? initial.doc : undefined,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Post text' },
    },
    onCreate: ({ editor: e }) => {
      if (initial.kind === 'markdown') {
        // Converted after creation so a failure leaves a usable empty editor and a message.
        try {
          e.commands.setContent(initial.markdown, { contentType: 'markdown', emitUpdate: false })
        } catch {
          e.commands.clearContent()
          onError('This post could not be converted to the rich-text editor. Its original text is kept.')
        }
      }
      onDocRef.current(e.getJSON())
    },
    onUpdate: ({ editor: e }) => onDocRef.current(e.getJSON()),
  })

  useEffect(() => {
    onEditor(editor)
    return () => onEditor(null)
  }, [editor, onEditor])

  if (!editor) return <p className="text-muted">Loading the editor...</p>

  return (
    <div className="rich-editor">
      <EditorToolbar editor={editor} canUpload={canUpload} uploading={uploading} onPickImage={onPickImage} onError={onError} />
      <EditorContent editor={editor} className="rich-editor-content" />
    </div>
  )
}
