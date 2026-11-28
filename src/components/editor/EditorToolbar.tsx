'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { splitCell } from '@tiptap/pm/tables'
import { BULLET_STYLES, ORDERED_STYLES } from '../../lib/blogDoc.ts'
import { canMergeCells, mergeSelectedCells, normalizeHex } from './blogTextExtensions.ts'
import { ColorPicker, ImageUrlForm, LinkForm, ToolButton, normalizeLink } from './ToolbarParts.tsx'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Bold,
  Code,
  Eraser,
  Highlighter,
  ImagePlus,
  ImageUp,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Maximize2,
  Merge,
  Minimize2,
  Minus,
  MinusSquare,
  Palette,
  Quote,
  Redo2,
  Split,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Trash2,
  Underline,
  Undo2,
  XSquare,
} from 'lucide-react'

interface Props {
  editor: Editor
  /** An upload or save is running. */
  busy: boolean
  /** The configured limit of an image address, in characters. */
  maxImageUrlLength: number
  onPickImage: () => void
  onError: (message: string) => void
  /** The card is in full screen mode. */
  fullscreen: boolean
  onToggleFullscreen: () => void
}

/** The one panel row that can be open under the toolbar. */
type Panel = 'color' | 'highlight' | 'link' | 'image' | null

const MOD = 'Ctrl/Cmd'
const CONTROLS = 'button:not(:disabled), select:not(:disabled)'
const ICON = 18

/**
 * The fixed editor toolbar: one persistent, sticky `role="toolbar"` with every control visible, in groups
 * (history, block type, text styles, color, lists, alignment, blocks, insert, table, view). The color, highlight, link
 * and image-by-URL forms open as one panel row under the toolbar. Roving tabindex: one Tab stop, the arrow keys
 * (and Home/End) move through the controls in DOM order, Escape returns to the text. The editor's Alt+F10
 * handler focuses the current stop (`[data-editor-toolbar] [tabindex="0"]`).
 */
export default function EditorToolbar({ editor, busy, maxImageUrlLength, onPickImage, onError, fullscreen, onToggleFullscreen }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const stopRef = useRef('undo')
  const [panel, setPanel] = useState<Panel>(null)

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const can = e.can()
      const level = e.isActive('heading', { level: 1 })
        ? '1'
        : e.isActive('heading', { level: 2 })
          ? '2'
          : e.isActive('heading', { level: 3 })
            ? '3'
            : e.isActive('paragraph')
              ? 'p'
              : 'other'
      return {
        canUndo: can.undo(),
        canRedo: can.redo(),
        block: level,
        canH1: can.setHeading({ level: 1 }),
        canH2: can.setHeading({ level: 2 }),
        canH3: can.setHeading({ level: 3 }),
        canParagraph: can.setParagraph(),
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        sub: e.isActive('subscript'),
        sup: e.isActive('superscript'),
        textColor: normalizeHex(e.getAttributes('textColor').color) ?? '',
        highlight: normalizeHex(e.getAttributes('highlight').color) ?? '',
        link: e.isActive('link'),
        linkHref: String(e.getAttributes('link').href ?? ''),
        codeBlock: e.isActive('codeBlock'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        task: e.isActive('taskList'),
        quote: e.isActive('blockquote'),
        canBullet: can.toggleBulletList(),
        canOrdered: can.toggleOrderedList(),
        canTask: can.toggleTaskList(),
        canQuote: can.toggleBlockquote(),
        canCodeBlock: can.toggleCodeBlock(),
        canRule: can.setHorizontalRule(),
        canTable: can.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
        bulletStyle: e.isActive('bulletList') ? String(e.getAttributes('bulletList').listStyle ?? '') : '',
        orderedStyle: e.isActive('orderedList') ? String(e.getAttributes('orderedList').listStyle ?? '') : '',
        alignLeft:
          e.isActive({ textAlign: 'left' }) ||
          (!e.isActive({ textAlign: 'center' }) && !e.isActive({ textAlign: 'right' }) && !e.isActive({ textAlign: 'justify' })),
        alignCenter: e.isActive({ textAlign: 'center' }),
        alignRight: e.isActive({ textAlign: 'right' }),
        alignJustify: e.isActive({ textAlign: 'justify' }),
        canRowBefore: can.addRowBefore(),
        canRowAfter: can.addRowAfter(),
        canColBefore: can.addColumnBefore(),
        canColAfter: can.addColumnAfter(),
        canDeleteRow: can.deleteRow(),
        canDeleteCol: can.deleteColumn(),
        canDeleteTable: can.deleteTable(),
        canMerge: canMergeCells(e.state),
        canSplit: splitCell(e.state),
      }
    },
  })

  const run = () => editor.chain().focus()
  const inList = s.bullet || s.ordered
  const noText = s.codeBlock

  // Roving tabindex: every control is -1 except the current stop (the last focused one while it is usable, else the first usable one).
  const applyStop = () => {
    const bar = barRef.current
    if (!bar) return
    const all = Array.from(bar.querySelectorAll<HTMLElement>('[data-tool-id]'))
    const usable = all.filter((el) => !(el as HTMLButtonElement).disabled)
    const stop = usable.find((el) => el.dataset.toolId === stopRef.current) ?? usable[0]
    for (const el of all) el.tabIndex = el === stop ? 0 : -1
  }
  useLayoutEffect(applyStop)

  const closePanel = () => {
    setPanel(null)
    editor.commands.focus()
  }

  const onBarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    // A select keeps its own Up and Down (they change its value).
    if (event.target instanceof HTMLSelectElement && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return
    const items = Array.from(barRef.current?.querySelectorAll<HTMLElement>(CONTROLS) ?? [])
    if (items.length === 0) return
    event.preventDefault()
    const current = items.indexOf((event.target as HTMLElement).closest<HTMLElement>('[data-tool-id]') as HTMLElement)
    let next = current
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % items.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    items[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    // An open panel closes and keeps the key; with none open the key bubbles (it may leave full screen).
    if (panel) {
      event.preventDefault()
      event.stopPropagation()
      setPanel(null)
    }
    editor.commands.focus()
  }

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const id = (event.target as HTMLElement).dataset.toolId
    if (!id) return
    stopRef.current = id
    applyStop()
  }

  const applyLink = (value: string) => {
    const href = normalizeLink(value)
    if (!href) {
      onError('Links must start with http, https or mailto.')
      return
    }
    run().extendMarkRange('link').setLink({ href }).run()
    setPanel(null)
  }

  const setBlock = (value: string) => {
    if (value === 'p') run().setParagraph().run()
    else if (value === '1' || value === '2' || value === '3') run().setHeading({ level: Number(value) as 1 | 2 | 3 }).run()
  }

  const group = (label: string, children: ReactNode) => (
    <div className="editor-toolbar-group" role="group" aria-label={label}>
      {children}
    </div>
  )

  const icon = (Icon: typeof Bold) => <Icon size={ICON} aria-hidden="true" />

  const tableAction = (id: string, label: string, Icon: typeof Bold, disabled: boolean, action: () => void) => (
    <ToolButton key={id} id={id} label={label} icon={icon(Icon)} disabled={disabled} onClick={action} />
  )

  return (
    <div className="editor-toolbar" onKeyDown={onKeyDown}>
      <div ref={barRef} className="editor-toolbar-rows" role="toolbar" aria-label="Formatting" data-editor-toolbar="" onKeyDown={onBarKeyDown} onFocus={onFocus}>
        {group(
          'History',
          <>
            <ToolButton id="undo" label="Undo" shortcut={`${MOD}+Z`} icon={icon(Undo2)} disabled={!s.canUndo} onClick={() => run().undo().run()} />
            <ToolButton id="redo" label="Redo" shortcut={`${MOD}+Shift+Z`} icon={icon(Redo2)} disabled={!s.canRedo} onClick={() => run().redo().run()} />
          </>,
        )}
        {group(
          'Block type',
          <>
            <label className="sr-only" htmlFor="editor-block-type">
              Block type
            </label>
            <select
              id="editor-block-type"
              className="select select-bordered select-sm editor-select"
              data-tool-id="block-type"
              title="Block type"
              value={s.block}
              onChange={(event) => setBlock(event.target.value)}
            >
              {s.block === 'other' && (
                <option value="other" disabled>
                  Other block
                </option>
              )}
              <option value="p" disabled={!s.canParagraph}>
                Paragraph
              </option>
              <option value="1" disabled={!s.canH1}>
                Heading 1
              </option>
              <option value="2" disabled={!s.canH2}>
                Heading 2
              </option>
              <option value="3" disabled={!s.canH3}>
                Heading 3
              </option>
            </select>
          </>,
        )}
        {group(
          'Text styles',
          <>
            <ToolButton id="bold" label="Bold" shortcut={`${MOD}+B`} icon={icon(Bold)} active={s.bold} disabled={noText} onClick={() => run().toggleBold().run()} />
            <ToolButton id="italic" label="Italic" shortcut={`${MOD}+I`} icon={icon(Italic)} active={s.italic} disabled={noText} onClick={() => run().toggleItalic().run()} />
            <ToolButton id="underline" label="Underline" shortcut={`${MOD}+U`} icon={icon(Underline)} active={s.underline} disabled={noText} onClick={() => run().toggleUnderline().run()} />
            <ToolButton id="strike" label="Strikethrough" shortcut={`${MOD}+Shift+S`} icon={icon(Strikethrough)} active={s.strike} disabled={noText} onClick={() => run().toggleStrike().run()} />
            <ToolButton id="code" label="Inline code" shortcut={`${MOD}+E`} icon={icon(Code)} active={s.code} disabled={noText} onClick={() => run().toggleCode().run()} />
            <ToolButton id="clear" label="Clear formatting" icon={icon(Eraser)} disabled={noText} onClick={() => run().unsetAllMarks().run()} />
          </>,
        )}
        {group(
          'Color and position',
          <>
            <ToolButton id="color" label="Text color" icon={icon(Palette)} active={s.textColor !== ''} disabled={noText} onClick={() => setPanel(panel === 'color' ? null : 'color')} />
            <ToolButton id="highlight" label="Highlight" icon={icon(Highlighter)} active={s.highlight !== ''} disabled={noText} onClick={() => setPanel(panel === 'highlight' ? null : 'highlight')} />
            <ToolButton id="sub" label="Subscript" shortcut={`${MOD}+,`} icon={icon(Subscript)} active={s.sub} disabled={noText} onClick={() => run().toggleSubscript().run()} />
            <ToolButton id="sup" label="Superscript" shortcut={`${MOD}+.`} icon={icon(Superscript)} active={s.sup} disabled={noText} onClick={() => run().toggleSuperscript().run()} />
          </>,
        )}
        {group(
          'Lists',
          <>
            <ToolButton id="bullet" label="Bulleted list" shortcut={`${MOD}+Shift+8`} icon={icon(List)} active={s.bullet} disabled={!s.canBullet} onClick={() => run().toggleBulletList().run()} />
            <ToolButton id="ordered" label="Numbered list" shortcut={`${MOD}+Shift+7`} icon={icon(ListOrdered)} active={s.ordered} disabled={!s.canOrdered} onClick={() => run().toggleOrderedList().run()} />
            <ToolButton id="task" label="Task list" shortcut={`${MOD}+Shift+9`} icon={icon(ListChecks)} active={s.task} disabled={!s.canTask} onClick={() => run().toggleTaskList().run()} />
            <label className="sr-only" htmlFor="editor-list-style">
              List style
            </label>
            <select
              id="editor-list-style"
              className="select select-bordered select-sm editor-select"
              data-tool-id="list-style"
              title="List style"
              disabled={!inList}
              value={s.bullet ? s.bulletStyle : s.ordered ? s.orderedStyle : ''}
              onChange={(event) => {
                const value = event.target.value || null
                run()
                  .updateAttributes(s.bullet ? 'bulletList' : 'orderedList', { listStyle: value })
                  .run()
              }}
            >
              <option value="">List style</option>
              {(s.ordered ? ORDERED_STYLES : BULLET_STYLES).map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </>,
        )}
        {group(
          'Alignment',
          <>
            <ToolButton id="align-left" label="Align left" shortcut={`${MOD}+Shift+L`} icon={icon(AlignLeft)} active={s.alignLeft} disabled={noText} onClick={() => run().setTextAlign('left').run()} />
            <ToolButton id="align-center" label="Align center" shortcut={`${MOD}+Shift+E`} icon={icon(AlignCenter)} active={s.alignCenter} disabled={noText} onClick={() => run().setTextAlign('center').run()} />
            <ToolButton id="align-right" label="Align right" shortcut={`${MOD}+Shift+R`} icon={icon(AlignRight)} active={s.alignRight} disabled={noText} onClick={() => run().setTextAlign('right').run()} />
            <ToolButton id="align-justify" label="Justify" shortcut={`${MOD}+Shift+J`} icon={icon(AlignJustify)} active={s.alignJustify} disabled={noText} onClick={() => run().setTextAlign('justify').run()} />
          </>,
        )}
        {group(
          'Blocks',
          <>
            <ToolButton id="quote" label="Block quote" shortcut={`${MOD}+Shift+B`} icon={icon(Quote)} active={s.quote} disabled={!s.canQuote} onClick={() => run().toggleBlockquote().run()} />
            <ToolButton id="code-block" label="Code block" shortcut={`${MOD}+Alt+C`} icon={icon(SquareCode)} active={s.codeBlock} disabled={!s.canCodeBlock} onClick={() => run().toggleCodeBlock().run()} />
            <ToolButton id="rule" label="Horizontal rule" icon={icon(Minus)} disabled={!s.canRule} onClick={() => run().setHorizontalRule().run()} />
          </>,
        )}
        {group(
          'Insert',
          <>
            <ToolButton
              id="link"
              label="Link"
              icon={icon(LinkIcon)}
              active={s.link}
              disabled={noText}
              onClick={() => setPanel(panel === 'link' ? null : 'link')}
            />
            <ToolButton id="image-upload" label="Upload image" icon={icon(ImageUp)} disabled={busy} onClick={onPickImage} />
            <ToolButton id="image-url" label="Image by URL" icon={icon(ImagePlus)} onClick={() => setPanel(panel === 'image' ? null : 'image')} />
          </>,
        )}
        {group(
          'Table',
          <>
            <ToolButton
              id="table"
              label="Insert table"
              icon={icon(Table)}
              disabled={!s.canTable}
              onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            />
            {tableAction('row-above', 'Add row above', BetweenHorizontalStart, !s.canRowBefore, () => run().addRowBefore().run())}
            {tableAction('row-below', 'Add row below', BetweenHorizontalEnd, !s.canRowAfter, () => run().addRowAfter().run())}
            {tableAction('col-left', 'Add column left', BetweenVerticalStart, !s.canColBefore, () => run().addColumnBefore().run())}
            {tableAction('col-right', 'Add column right', BetweenVerticalEnd, !s.canColAfter, () => run().addColumnAfter().run())}
            {tableAction('del-row', 'Delete row', MinusSquare, !s.canDeleteRow, () => run().deleteRow().run())}
            {tableAction('del-col', 'Delete column', XSquare, !s.canDeleteCol, () => run().deleteColumn().run())}
            {tableAction('merge', 'Merge cells', Merge, !s.canMerge, () => {
              mergeSelectedCells(editor.state, (tr) => editor.view.dispatch(tr))
              editor.view.focus()
            })}
            {tableAction('split', 'Split cell', Split, !s.canSplit, () => run().splitCell().run())}
            {tableAction('del-table', 'Delete table', Trash2, !s.canDeleteTable, () => run().deleteTable().run())}
          </>,
        )}
        {group(
          'View',
          <button
            type="button"
            className="editor-tool"
            data-tool-id="fullscreen"
            aria-label="Full screen"
            title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen (Esc to exit)'}
            aria-pressed={fullscreen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onToggleFullscreen}
          >
            {fullscreen ? <Minimize2 size={ICON} aria-hidden="true" /> : <Maximize2 size={ICON} aria-hidden="true" />}
          </button>,
        )}
      </div>
      {panel && (
        <div className="editor-toolbar-panel">
          {(panel === 'color' || panel === 'highlight') && (
            <ColorPicker
              key={panel}
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
              onClose={closePanel}
            />
          )}
          {panel === 'link' && (
            <LinkForm
              initial={s.linkHref}
              hasLink={s.link}
              onApply={applyLink}
              onRemove={() => {
                run().extendMarkRange('link').unsetLink().run()
                setPanel(null)
              }}
              onClose={closePanel}
            />
          )}
          {panel === 'image' && (
            <ImageUrlForm
              maxUrlLength={maxImageUrlLength}
              onError={onError}
              onClose={closePanel}
              onInsert={(src, alt) => {
                run().insertContent({ type: 'image', attrs: { src, alt } }).run()
                setPanel(null)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
