'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Editor } from '@tiptap/react'
import { FloatingMenu } from '@tiptap/react/menus'
import { charCount, isHttpsImageUrl } from '../../lib/blogDoc.ts'
import { ImagePlus, List, ListOrdered, Minus, Plus, Quote } from 'lucide-react'

interface Props {
  editor: Editor
  /** An upload or save is running. */
  busy: boolean
  /** The configured limit of an image address, in characters. */
  maxImageUrlLength: number
  onPickImage: () => void
  onError: (message: string) => void
}

function isNarrow(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 640px)').matches
}

/** The image control states: closed, the two choices, or the By URL form. */
type ImageMode = 'closed' | 'choose' | 'url'

const FOCUSABLE = 'button:not(:disabled)'

/**
 * The "+" insert menu on an empty line: image (Upload or By URL), horizontal rule, bulleted list,
 * numbered list, block quote. The editor's Alt+F10 handler focuses the "+" (`.editor-plus`); Enter or
 * Space opens the items, arrows move between them, Escape closes and returns to the editor.
 */
export default function InsertMenu({ editor, busy, maxImageUrlLength, onPickImage, onError }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [imageMode, setImageMode] = useState<ImageMode>('closed')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [narrow] = useState(isNarrow)

  const run = () => editor.chain().focus()

  // Typing or moving elsewhere folds the menu, so it never reopens stale on the next empty line.
  useEffect(() => {
    const fold = () => {
      setOpen(false)
      setImageMode('closed')
    }
    editor.on('update', fold)
    return () => {
      editor.off('update', fold)
    }
  }, [editor])

  const close = () => {
    setOpen(false)
    setImageMode('closed')
  }

  const insert = (action: () => void) => {
    action()
    close()
  }

  const insertUrlImage = () => {
    const src = imageUrl.trim()
    if (charCount(src) > maxImageUrlLength) {
      onError(`The image address is too long (limit ${maxImageUrlLength} characters).`)
      return
    }
    if (!isHttpsImageUrl(src)) {
      onError('Image addresses must start with https:// and have no spaces.')
      return
    }
    const alt = imageAlt.trim()
    if (charCount(alt) > 500) {
      onError('The image description is over the limit of 500 characters.')
      return
    }
    run()
      .insertContent({ type: 'image', attrs: { src, alt: alt || null } })
      .run()
    setImageUrl('')
    setImageAlt('')
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      editor.commands.focus()
      return
    }
    if (!open || imageMode === 'url') return
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    items[(current + step + items.length) % items.length]?.focus()
  }

  const item = (label: string, Icon: typeof Minus, action: () => void, disabled = false) => (
    <button
      type="button"
      className="editor-tool editor-insert-item"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )

  const urlKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      insertUrlImage()
    }
  }

  return (
    <FloatingMenu
      editor={editor}
      className="editor-insert"
      options={{ placement: narrow ? 'bottom-start' : 'left-start', offset: 8, flip: true, shift: { padding: 4 } }}
      shouldShow={({ editor: e, view, state }) => {
        const { $anchor, empty } = state.selection
        const emptyLine = empty && $anchor.depth === 1 && $anchor.parent.type.name === 'paragraph' && $anchor.parent.content.size === 0
        return emptyLine && e.isEditable && (view.hasFocus() || rootRef.current?.contains(document.activeElement) === true)
      }}
    >
      <div ref={rootRef}>
      <div className="editor-insert-bar" onKeyDown={onKeyDown}>
        <button
          type="button"
          className="editor-tool editor-plus"
          aria-label="Insert"
          title="Insert"
          aria-haspopup="true"
          aria-expanded={open}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        {open && imageMode === 'closed' && (
          <div className="editor-insert-items" role="group" aria-label="Insert a block">
            {item('Image', ImagePlus, () => setImageMode('choose'), busy)}
            {item('Horizontal rule', Minus, () => insert(() => run().setHorizontalRule().run()))}
            {item('Bulleted list', List, () => insert(() => run().toggleBulletList().run()))}
            {item('Numbered list', ListOrdered, () => insert(() => run().toggleOrderedList().run()))}
            {item('Quote', Quote, () => insert(() => run().toggleBlockquote().run()))}
          </div>
        )}
        {open && imageMode === 'choose' && (
          <div className="editor-insert-items">
            <button
              type="button"
              className="button-primary"
              disabled={busy}
              autoFocus
              onClick={() => {
                close()
                onPickImage()
              }}
            >
              Upload
            </button>
            <button type="button" className="button-secondary" onClick={() => setImageMode('url')}>
              By URL
            </button>
            <button type="button" className="button-secondary" onClick={() => setImageMode('closed')}>
              Back
            </button>
          </div>
        )}
      </div>
      {open && imageMode === 'url' && (
        <div className="editor-link-form" onKeyDown={onKeyDown}>
          <label className="sr-only" htmlFor="editor-image-url">
            Image address
          </label>
          <input
            id="editor-image-url"
            className="input input-bordered min-w-0 flex-1"
            placeholder="https://example.com/picture.png"
            value={imageUrl}
            autoFocus
            onChange={(event) => setImageUrl(event.target.value)}
            onKeyDown={urlKeys}
          />
          <label className="sr-only" htmlFor="editor-image-alt">
            Image description
          </label>
          <input
            id="editor-image-alt"
            className="input input-bordered min-w-0 flex-1"
            placeholder="Description (alt text)"
            value={imageAlt}
            onChange={(event) => setImageAlt(event.target.value)}
            onKeyDown={urlKeys}
          />
          <button type="button" className="button-primary" onClick={insertUrlImage}>
            Insert
          </button>
          <button type="button" className="button-secondary" onClick={close}>
            Cancel
          </button>
        </div>
      )}
      </div>
    </FloatingMenu>
  )
}
