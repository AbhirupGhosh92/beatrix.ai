'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { BULLET_STYLES, ORDERED_STYLES, charCount, isHttpsImageUrl } from '../../lib/blogDoc.ts'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'

interface Props {
  editor: Editor
  /** An upload or save is running. */
  busy: boolean
  /** The configured limit of an image address, in characters. */
  maxImageUrlLength: number
  onPickImage: () => void
  onError: (message: string) => void
}

/** The address as a link target: http, https or mailto only, `https://` added when no scheme is typed. */
export function normalizeLink(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`
  try {
    const protocol = new URL(withScheme).protocol
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' ? withScheme : null
  } catch {
    return null
  }
}

export default function EditorToolbar({ editor, busy, maxImageUrlLength, onPickImage, onError }: Props) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  // The image control: closed, the two choices, or the By URL form.
  const [imageMode, setImageMode] = useState<'closed' | 'choose' | 'url'>('closed')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      code: e.isActive('code'),
      codeBlock: e.isActive('codeBlock'),
      link: e.isActive('link'),
      alignLeft: e.isActive({ textAlign: 'left' }) || (!e.isActive({ textAlign: 'center' }) && !e.isActive({ textAlign: 'right' }) && !e.isActive({ textAlign: 'justify' })),
      alignCenter: e.isActive({ textAlign: 'center' }),
      alignRight: e.isActive({ textAlign: 'right' }),
      alignJustify: e.isActive({ textAlign: 'justify' }),
      bulletStyle: e.isActive('bulletList') ? String(e.getAttributes('bulletList').listStyle ?? '') : '',
      orderedStyle: e.isActive('orderedList') ? String(e.getAttributes('orderedList').listStyle ?? '') : '',
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const run = () => editor.chain().focus()

  const openLink = () => {
    setLinkValue(String(editor.getAttributes('link').href ?? ''))
    setLinkOpen(true)
  }

  const applyLink = () => {
    const href = normalizeLink(linkValue)
    if (!href) {
      onError('Links must start with http, https or mailto.')
      return
    }
    if (editor.state.selection.empty && !editor.isActive('link')) {
      run()
        .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
        .run()
    } else {
      run().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkOpen(false)
  }

  const removeLink = () => {
    run().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false)
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
    setImageMode('closed')
  }

  const tool = (label: string, Icon: typeof Bold, active: boolean, action: () => void, disabled = false) => (
    <button
      key={label}
      type="button"
      className="editor-tool"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  )

  return (
    <>
      <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
        <div className="editor-toolbar-group">
          {tool('Heading 1', Heading1, s.h1, () => run().toggleHeading({ level: 1 }).run())}
          {tool('Heading 2', Heading2, s.h2, () => run().toggleHeading({ level: 2 }).run())}
          {tool('Heading 3', Heading3, s.h3, () => run().toggleHeading({ level: 3 }).run())}
        </div>
        <div className="editor-toolbar-group">
          {tool('Bold', Bold, s.bold, () => run().toggleBold().run())}
          {tool('Italic', Italic, s.italic, () => run().toggleItalic().run())}
          {tool('Underline', UnderlineIcon, s.underline, () => run().toggleUnderline().run())}
          {tool('Strikethrough', Strikethrough, s.strike, () => run().toggleStrike().run())}
        </div>
        <div className="editor-toolbar-group">
          {tool('Bulleted list', List, s.bullet, () => run().toggleBulletList().run())}
          {tool('Numbered list', ListOrdered, s.ordered, () => run().toggleOrderedList().run())}
          {tool('Quote', Quote, s.quote, () => run().toggleBlockquote().run())}
        </div>
        <div className="editor-toolbar-group">
          {tool('Inline code', Code, s.code, () => run().toggleCode().run())}
          {tool('Code block', SquareCode, s.codeBlock, () => run().toggleCodeBlock().run())}
          {tool('Link', LinkIcon, s.link, openLink)}
          {tool('Horizontal rule', Minus, false, () => run().setHorizontalRule().run())}
          {tool('Insert image', ImagePlus, imageMode !== 'closed', () => setImageMode((m) => (m === 'closed' ? 'choose' : 'closed')), busy)}
        </div>
        <div className="editor-toolbar-group">
          {tool('Align left', AlignLeft, s.alignLeft, () => run().setTextAlign('left').run())}
          {tool('Align center', AlignCenter, s.alignCenter, () => run().setTextAlign('center').run())}
          {tool('Align right', AlignRight, s.alignRight, () => run().setTextAlign('right').run())}
          {tool('Justify', AlignJustify, s.alignJustify, () => run().setTextAlign('justify').run())}
        </div>
        {(s.bullet || s.ordered) && (
          <div className="editor-toolbar-group">
            <label className="sr-only" htmlFor="editor-list-style">
              List style
            </label>
            <select
              id="editor-list-style"
              className="select select-bordered select-sm"
              value={s.bullet ? s.bulletStyle : s.orderedStyle}
              onChange={(event) => {
                const value = event.target.value || null
                run()
                  .updateAttributes(s.bullet ? 'bulletList' : 'orderedList', { listStyle: value })
                  .run()
              }}
            >
              <option value="">Default</option>
              {(s.bullet ? BULLET_STYLES : ORDERED_STYLES).map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="editor-toolbar-group">
          {tool('Undo', Undo2, false, () => run().undo().run(), !s.canUndo)}
          {tool('Redo', Redo2, false, () => run().redo().run(), !s.canRedo)}
        </div>
      </div>

      {imageMode === 'choose' && (
        <div className="editor-link-form">
          <button type="button" className="button-primary" disabled={busy} onClick={() => { setImageMode('closed'); onPickImage() }}>
            Upload
          </button>
          <button type="button" className="button-secondary" onClick={() => setImageMode('url')}>
            By URL
          </button>
          <button type="button" className="button-secondary" onClick={() => setImageMode('closed')}>
            Cancel
          </button>
        </div>
      )}

      {imageMode === 'url' && (
        <div className="editor-link-form">
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
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                insertUrlImage()
              }
              if (event.key === 'Escape') setImageMode('closed')
            }}
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
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                insertUrlImage()
              }
              if (event.key === 'Escape') setImageMode('closed')
            }}
          />
          <button type="button" className="button-primary" onClick={insertUrlImage}>
            Insert
          </button>
          <button type="button" className="button-secondary" onClick={() => setImageMode('closed')}>
            Cancel
          </button>
        </div>
      )}

      {linkOpen && (
        <div className="editor-link-form">
          <label className="sr-only" htmlFor="editor-link-input">
            Link address
          </label>
          <input
            id="editor-link-input"
            className="input input-bordered min-w-0 flex-1"
            placeholder="https://example.com"
            value={linkValue}
            autoFocus
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applyLink()
              }
              if (event.key === 'Escape') setLinkOpen(false)
            }}
          />
          <button type="button" className="button-primary" onClick={applyLink}>
            Apply
          </button>
          {s.link && (
            <button type="button" className="button-secondary" onClick={removeLink}>
              Remove link
            </button>
          )}
          <button type="button" className="button-secondary" onClick={() => setLinkOpen(false)}>
            Cancel
          </button>
        </div>
      )}

      <BubbleMenu
        editor={editor}
        className="editor-bubble"
        shouldShow={({ editor: e, state }) => !state.selection.empty && e.isEditable && !e.isActive('codeBlock') && !e.isActive('image')}
      >
        {tool('Bold', Bold, s.bold, () => run().toggleBold().run())}
        {tool('Italic', Italic, s.italic, () => run().toggleItalic().run())}
        {tool('Underline', UnderlineIcon, s.underline, () => run().toggleUnderline().run())}
        {tool('Link', LinkIcon, s.link, openLink)}
      </BubbleMenu>
    </>
  )
}
