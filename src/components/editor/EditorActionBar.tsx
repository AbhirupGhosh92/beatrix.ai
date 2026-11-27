'use client'

import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { splitCell } from '@tiptap/pm/tables'
import { Redo2, Undo2 } from 'lucide-react'
import { canMergeCells, mergeSelectedCells } from './blogTextExtensions.ts'

interface Props {
  editor: Editor
}

const FOCUSABLE = 'button:not(:disabled)'

interface Item {
  id: string
  label: string
  /** Icon-only items show the icon; the others show their label as text. */
  icon?: typeof Undo2
  disabled: boolean
  run: () => void
}

/**
 * The always-visible action bar above the text: Undo and Redo, and, only while the cursor is in a table,
 * the table controls (rows, columns, delete, merge and split). A `role="toolbar"` with one tab stop and
 * arrow-key roving; Escape returns to the text. Each control is disabled when it cannot apply.
 */
export default function EditorActionBar({ editor }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState('undo')

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      inTable: e.isActive('table'),
      canRowBefore: e.can().addRowBefore(),
      canRowAfter: e.can().addRowAfter(),
      canColBefore: e.can().addColumnBefore(),
      canColAfter: e.can().addColumnAfter(),
      canDeleteRow: e.can().deleteRow(),
      canDeleteCol: e.can().deleteColumn(),
      canDeleteTable: e.can().deleteTable(),
      canMerge: canMergeCells(e.state),
      canSplit: splitCell(e.state),
    }),
  })

  const chain = () => editor.chain().focus()
  const history: Item[] = [
    { id: 'undo', label: 'Undo', icon: Undo2, disabled: !s.canUndo, run: () => chain().undo().run() },
    { id: 'redo', label: 'Redo', icon: Redo2, disabled: !s.canRedo, run: () => chain().redo().run() },
  ]
  const table: Item[] = s.inTable
    ? [
        { id: 'row-above', label: 'Row above', disabled: !s.canRowBefore, run: () => chain().addRowBefore().run() },
        { id: 'row-below', label: 'Row below', disabled: !s.canRowAfter, run: () => chain().addRowAfter().run() },
        { id: 'col-left', label: 'Column left', disabled: !s.canColBefore, run: () => chain().addColumnBefore().run() },
        { id: 'col-right', label: 'Column right', disabled: !s.canColAfter, run: () => chain().addColumnAfter().run() },
        { id: 'del-row', label: 'Delete row', disabled: !s.canDeleteRow, run: () => chain().deleteRow().run() },
        { id: 'del-col', label: 'Delete column', disabled: !s.canDeleteCol, run: () => chain().deleteColumn().run() },
        { id: 'del-table', label: 'Delete table', disabled: !s.canDeleteTable, run: () => chain().deleteTable().run() },
        {
          id: 'merge',
          label: 'Merge cells',
          disabled: !s.canMerge,
          run: () => {
            mergeSelectedCells(editor.state, (tr) => editor.view.dispatch(tr))
            editor.view.focus()
          },
        },
        { id: 'split', label: 'Split cell', disabled: !s.canSplit, run: () => chain().splitCell().run() },
      ]
    : []

  const all = [...history, ...table]
  // The one tab stop: the last focused control while it is usable, else the first usable one.
  const stop = all.find((i) => i.id === activeId && !i.disabled) ?? all.find((i) => !i.disabled)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      editor.commands.focus()
      return
    }
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
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

  const button = (item: Item) => {
    const Icon = item.icon
    return (
      <button
        key={item.id}
        type="button"
        className={Icon ? 'editor-tool' : 'editor-action'}
        aria-label={Icon ? item.label : undefined}
        title={item.label}
        disabled={item.disabled}
        tabIndex={stop?.id === item.id ? 0 : -1}
        onMouseDown={(event) => event.preventDefault()}
        onFocus={() => setActiveId(item.id)}
        onClick={item.run}
      >
        {Icon ? <Icon size={18} aria-hidden="true" /> : item.label}
      </button>
    )
  }

  return (
    <div ref={barRef} className="editor-actionbar" role="toolbar" aria-label="Editor actions" onKeyDown={onKeyDown}>
      <div className="editor-toolbar-group">{history.map(button)}</div>
      {table.length > 0 && (
        <div className="editor-toolbar-group editor-table-controls" role="group" aria-label="Table">
          {table.map(button)}
        </div>
      )}
    </div>
  )
}
