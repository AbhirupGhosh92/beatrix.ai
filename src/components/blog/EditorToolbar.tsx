'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
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
  /** An image can be uploaded (the post is saved and under the image limit). */
  canUpload: boolean
  uploading: boolean
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

export default function EditorToolbar({ editor, canUpload, uploading, onPickImage, onError }: Props) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')

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
          {tool('Insert image', ImagePlus, false, onPickImage, !canUpload || uploading)}
        </div>
        <div className="editor-toolbar-group">
          {tool('Undo', Undo2, false, () => run().undo().run(), !s.canUndo)}
          {tool('Redo', Redo2, false, () => run().redo().run(), !s.canRedo)}
        </div>
      </div>

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
