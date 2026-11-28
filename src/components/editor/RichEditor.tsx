'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MutableRefObject } from 'react'
import { EditorContent, Extension, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Table, TableRow } from '@tiptap/extension-table'
import { TaskList } from '@tiptap/extension-list'
import { Markdown } from '@tiptap/markdown'
import { ALIGN_VALUES, BULLET_STYLES, ORDERED_STYLES } from '../../lib/blogDoc.ts'
import EditorToolbar from './EditorToolbar.tsx'
import { createImage } from './blogImageExtension.ts'
import {
  BlogSubscript,
  BlogSuperscript,
  BlogTableCell,
  BlogTableHeader,
  BlogTaskItem,
  Highlight,
  TextColor,
} from './blogTextExtensions.ts'
import ImageToolbar from './ImageToolbar.tsx'
import UploadStatus from './UploadStatus.tsx'
import { UploadPlaceholder } from './uploadPlaceholder.ts'
import { useImageUploads } from './useImageUploads.ts'
import type { RichEditorHost } from './types.ts'

// The rich-text editor (Tiptap), independent of its host (see types.ts). A host loads it through
// next/dynamic, so the public pages and the home page never download it. Its schema is exactly the closed document in
// src/lib/blogDoc.ts: the server rejects anything else, so every attribute outside that list is
// removed here (Link keeps only `href`, Image only what blogImageExtension.ts lists, and the only
// other attributes are `textAlign` and `listStyle`, limited to the values of blogDoc.ts).

const BlogLink = Link.extend({
  addAttributes() {
    return { href: { default: null } }
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
  /** Filled with the function that forgets the edited-image history; the host calls it after a save (the originals are deleted then). */
  clearEditsRef?: MutableRefObject<(() => void) | null>
}

export default function RichEditor({ host, busy, onEditor, pickImageRef, clearEditsRef }: Props) {
  const { initial } = host
  // The latest host and busy flag, read by callbacks so a new host object never recreates the editor.
  const hostRef = useRef(host)
  const busyRef = useRef(busy)
  useEffect(() => {
    hostRef.current = host
    busyRef.current = busy
  }, [host, busy])
  const fileRef = useRef<HTMLInputElement>(null)
  // Set once the editor exists; drop and paste handlers (created with the editor) read it when they fire.
  const enqueueRef = useRef<((files: File[], pos: number | null) => void) | null>(null)

  const [imageUrl] = useState(() => (id: string) => hostRef.current.images.imageUrl(id))
  const legacyScheme = host.images.legacyScheme ?? null
  // New image id -> the first image of its edit chain, so Reset can go back to it (client-only, never stored).
  const [editedFrom] = useState(() => new Map<string, string>())
  useEffect(() => {
    if (!clearEditsRef) return
    clearEditsRef.current = () => editedFrom.clear()
    return () => {
      clearEditsRef.current = null
    }
  }, [clearEditsRef, editedFrom])

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
      TextColor,
      Highlight,
      BlogSubscript,
      BlogSuperscript,
      Table.configure({ resizable: false }),
      TableRow,
      BlogTableHeader,
      BlogTableCell,
      TaskList,
      BlogTaskItem,
      UploadPlaceholder,
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
      // Image files only: text and HTML drops and pastes stay with Tiptap.
      handleDrop: (view, event, _slice, moved) => {
        const files = Array.from(event.dataTransfer?.files ?? [])
        if (moved || files.length === 0 || !enqueueRef.current) return false
        event.preventDefault()
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY })
        enqueueRef.current(files, at ? at.pos : null)
        return true
      },
      handlePaste: (_view, event) => {
        const data = event.clipboardData
        const files = Array.from(data?.files ?? []).filter((file) => file.type.startsWith('image/'))
        if (files.length === 0 || !enqueueRef.current) return false
        // A copy from a document or spreadsheet carries a preview image next to its text: that stays text.
        const html = (data?.getData('text/html') ?? '').replace(/<[^>]*>/g, '').trim()
        if (html !== '' || (data?.getData('text/plain') ?? '').trim() !== '') return false
        event.preventDefault()
        enqueueRef.current(files, null)
        return true
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

  const uploads = useImageUploads(editor, hostRef)
  useEffect(() => {
    enqueueRef.current = (files, pos) => uploads.enqueue(files, pos)
  })

  /** The Upload control. A saved document opens the picker at once (the click's activation is still valid). */
  const requestUpload = () => {
    const { images, onError } = hostRef.current
    if (busyRef.current) return
    const open = (afterSave: boolean) => {
      try {
        fileRef.current?.showPicker()
      } catch {
        // A save can spend the click's activation: showPicker then refuses and the next click opens it.
        onError((afterSave && images.messages?.pickerRefused) || 'The image picker did not open. Choose the image again.')
      }
    }
    const step = uploads.prepare()
    if (step.needed) {
      void step.done.then((ok) => {
        if (ok) open(true)
      })
      return
    }
    if (images.limits.remaining() - uploads.pending() <= 0) {
      onError(images.messages?.limitReached ?? 'No more images can be added.')
      return
    }
    open(false)
  }
  useEffect(() => {
    if (!pickImageRef) return
    pickImageRef.current = () => requestUpload()
    return () => {
      pickImageRef.current = null
    }
  })

  // Full screen is a CSS mode of this same card (no portal, no remount), so the view, selection and undo history survive.
  const [full, setFull] = useState(false)
  useEffect(() => {
    if (!full) return
    // The page behind does not scroll; the previous inline value comes back on exit, unmount and Strict Mode re-runs.
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [full])
  useEffect(() => {
    if (!full) return
    // Escape leaves full screen unless the image dialog or a toolbar panel is open (the toolbar closes the panel first).
    // `defaultPrevented` is not checked: ProseMirror's own Escape binding (select parent node) always prevents the default.
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open], .editor-toolbar-panel')) return
      setFull(false)
      editor?.commands.focus()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [full, editor])

  if (!editor) return <p className="text-muted">Loading the editor...</p>

  // While full, Tab wraps between the first and last focusable element of the card.
  const wrapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled):not([tabindex="-1"]), select:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), [tabindex="0"], [contenteditable="true"]',
      ),
    )
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // Alt+F10 moves focus to the image toolbar (an image is selected) or the toolbar's current control.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (full && event.key === 'Tab') {
      wrapTab(event)
      return
    }
    if (!(event.altKey && event.key === 'F10')) return
    const root = event.currentTarget
    const target = editor.isActive('image')
      ? root.querySelector<HTMLElement>('[data-image-toolbar] button:not(:disabled)')
      : root.querySelector<HTMLElement>('[data-editor-toolbar] [tabindex="0"]')
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  return (
    <div
      className={full ? 'rich-editor rich-editor--full' : 'rich-editor'}
      onKeyDown={onKeyDown}
      {...(full ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Full screen editor' } : {})}
    >
      <EditorToolbar
        editor={editor}
        busy={busy}
        maxImageUrlLength={host.images.limits.maxUrlLength}
        onPickImage={requestUpload}
        onError={host.onError}
        fullscreen={full}
        onToggleFullscreen={() => setFull((value) => !value)}
      />
      <EditorContent editor={editor} className="rich-editor-content" />
      <ImageToolbar editor={editor} images={host.images} edits={editedFrom} onError={host.onError} />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) uploads.enqueue(files, null, true)
        }}
      />
      <UploadStatus items={uploads.items} onDismiss={uploads.dismiss} />
      <p className="editor-hint">
        The toolbar above has every format; hover a button to see its shortcut. Common ones: Ctrl/Cmd+B bold, +I italic, +U underline, +Z undo. Press Alt+F10
        to reach the toolbar, then the arrow keys to move and Escape to return to the text.
      </p>
    </div>
  )
}
