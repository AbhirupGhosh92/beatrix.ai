'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { EditorContent, Extension, nodeInputRule, useEditor } from '@tiptap/react'
import type { Editor, JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Markdown } from '@tiptap/markdown'
import { ALIGN_VALUES, BULLET_STYLES, ORDERED_STYLES, isHttpsImageUrl } from '../../lib/blogDoc.ts'
import { BLOG_IMAGE_SCHEME } from '../../lib/blogTypes.ts'
import FloatingToolbar from './FloatingToolbar.tsx'
import InsertMenu from './InsertMenu.tsx'

// The rich-text editor (Tiptap). Loaded only by BlogEditor through next/dynamic, so the public pages
// and the home page never download it. Its schema is exactly the closed document in
// src/lib/blogDoc.ts: the server rejects anything else, so every attribute outside that list is
// removed here (Link keeps only `href`, Image keeps only `imageId`, `src` and `alt`, and the only
// other attributes are `textAlign` and `listStyle`, limited to the values of blogDoc.ts).

const IMAGE_ID = /^[A-Za-z0-9_-]{1,100}$/

const BlogLink = Link.extend({
  addAttributes() {
    return { href: { default: null } }
  },
})

interface ImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, unknown>
  resize: false
  /** The id of the post as it is now (read when an image is rendered, never frozen at mount). */
  getPostId: () => string | null
}

// `![alt](https://...)` typed in the editor; any other source is not turned into an image.
const IMAGE_INPUT = /(?:^|\s)(!\[([^\]]*)\]\((\S+?)(?:\s+["'][^"']*["'])?\))$/

const BlogImage = Image.extend<ImageOptions>({
  addOptions() {
    return { inline: false, allowBase64: false, HTMLAttributes: {}, resize: false, getPostId: () => null }
  },
  addAttributes() {
    return {
      imageId: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-image-id') },
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          if (el.hasAttribute('data-image-id')) return null
          const src = el.getAttribute('src')
          return isHttpsImageUrl(src) ? src : null
        },
      },
      alt: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'img[data-image-id]' }, { tag: 'img[src^="https://"]' }]
  },
  renderHTML({ node }) {
    const alt = String(node.attrs.alt ?? '')
    if (node.attrs.imageId) {
      const postId = this.options.getPostId()
      const imageId = String(node.attrs.imageId)
      return [
        'img',
        {
          ...(postId ? { src: `/api/blog/${encodeURIComponent(postId)}/images/${imageId}` } : {}),
          alt,
          'data-image-id': imageId,
          loading: 'lazy',
          decoding: 'async',
        },
      ]
    }
    const src = node.attrs.src
    return ['img', { ...(isHttpsImageUrl(src) ? { src } : {}), alt, referrerPolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }]
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: IMAGE_INPUT,
        type: this.type,
        getAttributes: (match) => (isHttpsImageUrl(match[3]) ? { src: match[3], alt: match[2] || null } : false),
      }),
    ]
  },
  // Legacy Markdown: `![name](blog-image:<id>)` becomes an image node; any other source is dropped.
  parseMarkdown: (token, helpers) => {
    const href = String(token.href ?? '')
    const id = href.startsWith(BLOG_IMAGE_SCHEME) ? href.slice(BLOG_IMAGE_SCHEME.length) : ''
    if (!IMAGE_ID.test(id)) return []
    return helpers.createNode('image', { imageId: id, alt: token.text ? String(token.text) : null })
  },
})

function listStyleAttr(allowed: readonly string[]) {
  return {
    listStyle: {
      default: null,
      // The value returned is the constant from the whitelist, never the parsed text itself.
      parseHTML: (el: HTMLElement) => allowed.find((style) => style === el.style.listStyleType) ?? null,
      renderHTML: (attributes: Record<string, unknown>) => {
        const hit = allowed.find((style) => style === attributes.listStyle)
        return hit ? { style: `list-style-type: ${hit}` } : {}
      },
    },
  }
}

// `listStyle` on bullet and numbered lists: only the whitelisted values of src/lib/blogDoc.ts.
const ListStyle = Extension.create({
  name: 'listStyle',
  addGlobalAttributes() {
    return [
      { types: ['bulletList'], attributes: listStyleAttr(BULLET_STYLES) },
      { types: ['orderedList'], attributes: listStyleAttr(ORDERED_STYLES) },
    ]
  },
})

export type EditorInitial = { kind: 'empty' } | { kind: 'doc'; doc: JSONContent } | { kind: 'markdown'; markdown: string }

interface Props {
  initial: EditorInitial
  /** The post the images belong to (null until it is saved once); read when an image is inserted. */
  postId: string | null
  /** An upload or save is running: the image control waits. */
  busy: boolean
  /** The configured limit of an image address, in characters. */
  maxImageUrlLength: number
  onPickImage: () => void
  /** Every change, as the editor's document JSON (validated by the caller before saving). */
  onDoc: (doc: JSONContent) => void
  /** The live editor, so the caller can insert an uploaded image. */
  onEditor: (editor: Editor | null) => void
  onError: (message: string) => void
}

export default function RichEditor({ initial, postId, busy, maxImageUrlLength, onPickImage, onDoc, onEditor, onError }: Props) {
  const onDocRef = useRef(onDoc)
  useEffect(() => {
    onDocRef.current = onDoc
  }, [onDoc])

  // The current post id: the first save gives a new post its id while this editor stays mounted.
  const postIdRef = useRef(postId)
  useEffect(() => {
    postIdRef.current = postId
  }, [postId])

  const [getPostId] = useState(() => () => postIdRef.current)

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
      BlogImage.configure({ getPostId }),
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: [...ALIGN_VALUES] }),
      ListStyle,
      Markdown,
    ],
    [getPostId],
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

  // Alt+F10 moves focus into the floating toolbar (text selected) or the "+" control (empty line).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.altKey && event.key === 'F10')) return
    const root = event.currentTarget
    const target = editor.state.selection.empty
      ? root.querySelector<HTMLElement>('.editor-plus')
      : root.querySelector<HTMLElement>('[data-floating-toolbar] button:not(:disabled)')
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  return (
    <div className="rich-editor" onKeyDown={onKeyDown}>
      <EditorContent editor={editor} className="rich-editor-content" />
      <FloatingToolbar editor={editor} onError={onError} />
      <InsertMenu editor={editor} busy={busy} maxImageUrlLength={maxImageUrlLength} onPickImage={onPickImage} onError={onError} />
      <p className="editor-hint">
        Select text for formatting, or press Enter on a new line and use the plus button. Shortcuts: Ctrl/Cmd+B bold, +I italic, +U underline, +Z undo, Alt+F10 to
        reach the toolbar.
      </p>
    </div>
  )
}
