'use client'

import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { BULLET_STYLES, ORDERED_STYLES } from '../../lib/blogDoc.ts'
import { COLOR_PRESETS, HIGHLIGHT_PRESETS, normalizeHex } from './blogTextExtensions.ts'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
} from 'lucide-react'

interface Props {
  editor: Editor
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

/** A coarse pointer (touch) puts the toolbar below the selection so it never sits under the OS handles. */
function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

const FOCUSABLE = 'button:not(:disabled), select:not(:disabled)'

/** Which color panel replaces the toolbar buttons: the text color or the highlight. */
type ColorPanel = 'color' | 'highlight' | null

interface ColorPanelProps {
  kind: 'color' | 'highlight'
  /** The color of the selection now (#rrggbb) or '' when none. */
  current: string
  onPick: (hex: string) => void
  onRemove: () => void
  onClose: () => void
}

/** Named preset swatches, a native color input for a free choice, and Remove. */
function ColorPicker({ kind, current, onPick, onRemove, onClose }: ColorPanelProps) {
  const presets = kind === 'color' ? COLOR_PRESETS : HIGHLIGHT_PRESETS
  const title = kind === 'color' ? 'Text color' : 'Highlight'
  const [custom, setCustom] = useState(current || presets[0].hex)
  return (
    <div className="editor-color-panel" role="group" aria-label={title}>
      <div className="editor-swatches">
        {presets.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            className="editor-swatch"
            style={{ backgroundColor: preset.hex }}
            aria-label={preset.name}
            title={preset.name}
            aria-pressed={current === preset.hex}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(preset.hex)}
          />
        ))}
      </div>
      <div className="editor-color-custom">
        <label className="text-meta" htmlFor={`editor-color-${kind}`}>
          Custom
        </label>
        <input id={`editor-color-${kind}`} type="color" className="editor-color-input" value={custom} onChange={(event) => setCustom(event.target.value)} />
        <button type="button" className="button-primary" onMouseDown={(event) => event.preventDefault()} onClick={() => onPick(custom)}>
          Apply
        </button>
        <button type="button" className="button-secondary" disabled={!current} onMouseDown={(event) => event.preventDefault()} onClick={onRemove}>
          Remove
        </button>
        <button type="button" className="button-secondary" onMouseDown={(event) => event.preventDefault()} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

/**
 * The floating formatting toolbar: shown next to a text selection (mouse, touch or Shift+arrows).
 * A `role="toolbar"` with arrow-key roving; Escape returns to the editor. The editor's Alt+F10 handler
 * moves focus here (it looks for `[data-floating-toolbar] button`).
 */
export default function FloatingToolbar({ editor, onError }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [panel, setPanel] = useState<ColorPanel>(null)
  const [coarse] = useState(isCoarsePointer)

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      sub: e.isActive('subscript'),
      sup: e.isActive('superscript'),
      textColor: normalizeHex(e.getAttributes('textColor').color) ?? '',
      highlight: normalizeHex(e.getAttributes('highlight').color) ?? '',
      code: e.isActive('code'),
      codeBlock: e.isActive('codeBlock'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      alignLeft:
        e.isActive({ textAlign: 'left' }) ||
        (!e.isActive({ textAlign: 'center' }) && !e.isActive({ textAlign: 'right' }) && !e.isActive({ textAlign: 'justify' })),
      alignCenter: e.isActive({ textAlign: 'center' }),
      alignRight: e.isActive({ textAlign: 'right' }),
      alignJustify: e.isActive({ textAlign: 'justify' }),
      bulletStyle: e.isActive('bulletList') ? String(e.getAttributes('bulletList').listStyle ?? '') : '',
      orderedStyle: e.isActive('orderedList') ? String(e.getAttributes('orderedList').listStyle ?? '') : '',
    }),
  })

  const run = () => editor.chain().focus()

  const openLink = () => {
    setLinkValue(String(editor.getAttributes('link').href ?? ''))
    setLinkOpen(true)
  }

  const closeLink = () => {
    setLinkOpen(false)
    editor.commands.focus()
  }

  const applyLink = () => {
    const href = normalizeLink(linkValue)
    if (!href) {
      onError('Links must start with http, https or mailto.')
      return
    }
    run().extendMarkRange('link').setLink({ href }).run()
    setLinkOpen(false)
  }

  const removeLink = () => {
    run().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (linkOpen) setLinkOpen(false)
      if (panel) setPanel(null)
      editor.commands.focus()
      return
    }
    if (linkOpen || event.target instanceof HTMLInputElement) return
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(event.key)) return
    const items = Array.from(barRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (items.length === 0) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLElement)
    let next = current
    if (event.key === 'ArrowRight') next = (current + 1) % items.length
    if (event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    items[next]?.focus()
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
      <Icon size={18} aria-hidden="true" />
    </button>
  )

  return (
    <BubbleMenu
      editor={editor}
      className="editor-bubble"
      options={{ placement: coarse ? 'bottom' : 'top', offset: 8, flip: true, shift: { padding: 8 } }}
      shouldShow={({ editor: e, view, state, element }) =>
        !state.selection.empty &&
        e.isEditable &&
        !e.isActive('image') &&
        (view.hasFocus() || element.contains(document.activeElement))
      }
    >
      <div ref={barRef} className="editor-floating" role="toolbar" aria-label="Formatting" data-floating-toolbar="" onKeyDown={onKeyDown}>
        {panel ? (
          <ColorPicker
            kind={panel}
            current={panel === 'color' ? s.textColor : s.highlight}
            onPick={(hex) => {
              const color = normalizeHex(hex)
              if (color) run().setMark(panel === 'color' ? 'textColor' : 'highlight', { color }).run()
              setPanel(null)
            }}
            onRemove={() => {
              run().unsetMark(panel === 'color' ? 'textColor' : 'highlight').run()
              setPanel(null)
            }}
            onClose={() => {
              setPanel(null)
              editor.commands.focus()
            }}
          />
        ) : linkOpen ? (
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
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  closeLink()
                }
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
            <button type="button" className="button-secondary" onClick={closeLink}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="editor-toolbar-group">
              {tool('Bold', Bold, s.bold, () => run().toggleBold().run(), s.codeBlock)}
              {tool('Italic', Italic, s.italic, () => run().toggleItalic().run(), s.codeBlock)}
              {tool('Underline', Underline, s.underline, () => run().toggleUnderline().run(), s.codeBlock)}
              {tool('Strikethrough', Strikethrough, s.strike, () => run().toggleStrike().run(), s.codeBlock)}
              {tool('Inline code', Code, s.code, () => run().toggleCode().run(), s.codeBlock)}
              {tool('Link', LinkIcon, s.link, openLink, s.codeBlock)}
              {tool('Text color', Palette, s.textColor !== '', () => setPanel('color'), s.codeBlock)}
              {tool('Highlight', Highlighter, s.highlight !== '', () => setPanel('highlight'), s.codeBlock)}
              {tool('Subscript', Subscript, s.sub, () => run().toggleSubscript().run(), s.codeBlock)}
              {tool('Superscript', Superscript, s.sup, () => run().toggleSuperscript().run(), s.codeBlock)}
              {tool('Clear formatting', Eraser, false, () => run().unsetAllMarks().run(), s.codeBlock)}
            </div>
            <div className="editor-toolbar-group">
              {tool('Heading 2', Heading2, s.h2, () => run().toggleHeading({ level: 2 }).run(), s.codeBlock)}
              {tool('Heading 3', Heading3, s.h3, () => run().toggleHeading({ level: 3 }).run(), s.codeBlock)}
              {tool('Quote', Quote, s.quote, () => run().toggleBlockquote().run(), s.codeBlock)}
              {tool('Code block', SquareCode, s.codeBlock, () => run().toggleCodeBlock().run())}
            </div>
            <div className="editor-toolbar-group">
              {tool('Bulleted list', List, s.bullet, () => run().toggleBulletList().run(), s.codeBlock)}
              {tool('Numbered list', ListOrdered, s.ordered, () => run().toggleOrderedList().run(), s.codeBlock)}
              {(s.bullet || s.ordered) && !s.codeBlock && (
                <>
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
                </>
              )}
            </div>
            <div className="editor-toolbar-group">
              {tool('Align left', AlignLeft, s.alignLeft, () => run().setTextAlign('left').run(), s.codeBlock)}
              {tool('Align center', AlignCenter, s.alignCenter, () => run().setTextAlign('center').run(), s.codeBlock)}
              {tool('Align right', AlignRight, s.alignRight, () => run().setTextAlign('right').run(), s.codeBlock)}
              {tool('Justify', AlignJustify, s.alignJustify, () => run().setTextAlign('justify').run(), s.codeBlock)}
            </div>
          </>
        )}
      </div>
    </BubbleMenu>
  )
}
