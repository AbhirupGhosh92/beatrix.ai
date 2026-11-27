'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MutableRefObject } from 'react'
import { EditorContent, Extension, nodeInputRule, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Markdown } from '@tiptap/markdown'
import { ALIGN_VALUES, BULLET_STYLES, ORDERED_STYLES, isHttpsImageUrl } from '../../lib/blogDoc.ts'
import FloatingToolbar from './FloatingToolbar.tsx'
import InsertMenu from './InsertMenu.tsx'
import type { RichEditorHost } from './types.ts'

// The rich-text editor (Tiptap), independent of its host (see types.ts). A host loads it through
// next/dynamic, so the public pages and the home page never download it. Its schema is exactly the closed document in
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
  /** The address of a stored image as the host gives it now (read when rendered, never frozen at mount). */
  imageUrl: (id: string) => string
}

// `![alt](https://...)` typed in the editor; any other source is not turned into an image.
const IMAGE_INPUT = /(?:^|\s)(!\[([^\]]*)\]\((\S+?)(?:\s+["'][^"']*["'])?\))$/

// `legacyScheme`: the Markdown image scheme to import (none: Markdown images are dropped).
const createImage = (legacyScheme: string | null) =>
  Image.extend<ImageOptions>({
    addOptions() {
      return {
        inline: false,
        allowBase64: false,
        HTMLAttributes: {},
        resize: false,
        imageUrl: () => '',
      }
    },
    addAttributes() {
      return {
        imageId: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute('data-image-id'),
        },
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
        const imageId = String(node.attrs.imageId)
        const url = this.options.imageUrl(imageId)
        return [
          'img',
          {
            ...(url ? { src: url } : {}),
            alt,
            'data-image-id': imageId,
            loading: 'lazy',
            decoding: 'async',
          },
        ]
      }
      const src = node.attrs.src
      return [
        'img',
        {
          ...(isHttpsImageUrl(src) ? { src } : {}),
          alt,
          referrerPolicy: 'no-referrer',
          loading: 'lazy',
          decoding: 'async',
        },
      ]
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
    // Legacy Markdown: `![name](<scheme><id>)` becomes an image node; any other source is dropped.
    parseMarkdown: (token, helpers) => {
      const href = String(token.href ?? '')
      const id = legacyScheme && href.startsWith(legacyScheme) ? href.slice(legacyScheme.length) : ''
      if (!IMAGE_ID.test(id)) return []
      return helpers.createNode('image', {
        imageId: id,
        alt: token.text ? String(token.text) : null,
      })
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

interface Props {
  host: RichEditorHost
  /** The host is busy (saving or deleting): the image control waits. */
  busy: boolean
  /** The live editor, so the host can insert an image it stored itself. */
  onEditor: (editor: Editor | null) => void
  /** Filled with the function that starts an image upload (the picker), for a host control outside the editor. */
  pickImageRef?: MutableRefObject<(() => void) | null>
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

export default function RichEditor({ host, busy, onEditor, pickImageRef }: Props) {
  const { initial } = host
  // The latest host and busy flag, read by callbacks so a new host object never recreates the editor.
  const hostRef = useRef(host)
  const busyRef = useRef(busy)
  useEffect(() => {
    hostRef.current = host
    busyRef.current = busy
  }, [host, busy])
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadCount = useRef(0)
  const [uploading, setUploading] = useState(false)
  const uploadingRef = useRef(false)

  const [imageUrl] = useState(() => (id: string) => hostRef.current.images.imageUrl(id))
  const legacyScheme = host.images.legacyScheme ?? null

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
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow ugc',
          target: '_blank',
        },
      }),
      createImage(legacyScheme).configure({ imageUrl }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: [...ALIGN_VALUES],
      }),
      ListStyle,
      Markdown,
    ],
    [imageUrl, legacyScheme],
  )

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: initial.kind === 'doc' ? initial.doc : undefined,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': host.label,
      },
    },
    onCreate: ({ editor: e }) => {
      if (initial.kind === 'markdown') {
        // Converted after creation so a failure leaves a usable empty editor and a message.
        try {
          e.commands.setContent(initial.markdown, {
            contentType: 'markdown',
            emitUpdate: false,
          })
        } catch {
          e.commands.clearContent()
          hostRef.current.onError('This post could not be converted to the rich-text editor. Its original text is kept.')
        }
      }
      hostRef.current.onDoc(e.getJSON())
    },
    onUpdate: ({ editor: e }) => hostRef.current.onDoc(e.getJSON()),
  })

  useEffect(() => {
    onEditor(editor)
    return () => onEditor(null)
  }, [editor, onEditor])

  /** The Upload control. The host may first save a never-saved document; then the picker opens. */
  const requestUpload = async () => {
    const { images, onError } = hostRef.current
    if (busyRef.current || uploadingRef.current) return
    if (images.ensureSaved) {
      if (!(await images.ensureSaved())) return
    } else if (images.limits.remaining() <= 0) {
      onError('No more images can be added.')
      return
    }
    // The click's activation may be spent by a save: showPicker can refuse, then the next click opens it.
    try {
      fileRef.current?.showPicker()
    } catch {
      onError('The image picker did not open. Choose the image again.')
    }
  }
  useEffect(() => {
    if (!pickImageRef) return
    pickImageRef.current = () => void requestUpload()
    return () => {
      pickImageRef.current = null
    }
  })

  const uploadFile = async (file: File) => {
    const { images, onError } = hostRef.current
    if (file.size > images.limits.maxBytes) {
      onError(`That image is over the ${formatBytes(images.limits.maxBytes)} limit.`)
      return
    }
    uploadingRef.current = true
    setUploading(true)
    try {
      const uploadId = `upload-${(uploadCount.current += 1)}`
      const image = await images.upload({
        name: file.name,
        dataBase64: await readBase64(file),
        uploadId,
      })
      const alt = Array.from(image.name.replace(/\.[^.]*$/, ''))
        .slice(0, 500)
        .join('')
      editor
        ?.chain()
        .focus()
        .insertContent({ type: 'image', attrs: { imageId: image.id, alt } })
        .run()
    } catch {
      // The host already told the user (or the file could not be read).
    } finally {
      uploadingRef.current = false
      setUploading(false)
    }
  }

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
      <FloatingToolbar editor={editor} onError={host.onError} />
      <InsertMenu
        editor={editor}
        busy={busy || uploading}
        maxImageUrlLength={host.images.limits.maxUrlLength}
        onPickImage={() => void requestUpload()}
        onError={host.onError}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void uploadFile(file)
        }}
      />
      <p className="editor-hint">
        Select text for formatting, or press Enter on a new line and use the plus button. Shortcuts: Ctrl/Cmd+B bold, +I italic, +U underline, +Z undo, Alt+F10
        to reach the toolbar.
      </p>
    </div>
  )
}
