import { Mark } from '@tiptap/react'
import { TableCell, TableHeader } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-list'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Fragment } from '@tiptap/pm/model'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Selection } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { CellSelection, mergeCells } from '@tiptap/pm/tables'
import { MAX_TABLE_COLS, MAX_TABLE_ROWS, isHexColor } from '../../lib/blogDoc.ts'
import { readableInk } from '../../lib/blogColor.ts'
import { TEXT_PRESETS, presetClass } from '../../lib/blogColorPresets.ts'

// In-repo Tiptap extensions for the text tools. Each stores exactly what src/lib/blogDoc.ts allows:
// a color mark holds only `color` (#rrggbb), a table cell only `colspan` and `rowspan`, a task item only
// `checked`. HTML pasted into the editor is read only through our own `data-color` marker or through
// attributes that are re-validated here, never through an inline `style`.

/** The colors offered as swatches. Stored values are always the hex, so a preset is just a shortcut. */
export const COLOR_PRESETS: ReadonlyArray<{ name: string; hex: string }> = TEXT_PRESETS

/** The highlight swatches: light and mid tones that stay readable with the automatic ink. */
export const HIGHLIGHT_PRESETS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: 'Yellow', hex: '#fde68a' },
  { name: 'Green', hex: '#a7f3d0' },
  { name: 'Blue', hex: '#bfdbfe' },
  { name: 'Pink', hex: '#fbcfe8' },
  { name: 'Orange', hex: '#fed7aa' },
  { name: 'Violet', hex: '#ddd6fe' },
  { name: 'Gray', hex: '#e5e7eb' },
]

/** The color as stored (lowercase #rrggbb), or null when it is not one. */
export function normalizeHex(value: unknown): string | null {
  return isHexColor(value) ? value.toLowerCase() : null
}

function colorAttrs() {
  return {
    color: {
      default: null,
      // Only our own marker, and only a valid #rrggbb: an inline style color is never read.
      parseHTML: (el: HTMLElement) => normalizeHex(el.getAttribute('data-color')),
      renderHTML: () => ({}),
    },
  }
}

const validMarker = (el: HTMLElement | string) => (typeof el !== 'string' && normalizeHex(el.getAttribute('data-color')) ? null : false)

/** Text color. Priority below the highlight so the color mark is the inner element, as in the reader. */
export const TextColor = Mark.create({
  name: 'textColor',
  priority: 90,
  addAttributes: colorAttrs,
  parseHTML() {
    return [{ tag: 'span.blog-color[data-color]', getAttrs: validMarker }]
  },
  renderHTML({ mark }) {
    const hex = normalizeHex(mark.attrs.color)
    if (!hex) return ['span', 0]
    // A preset is drawn through its fixed per-theme class; a free color sets only the custom property.
    const preset = presetClass(hex)
    return preset
      ? ['span', { class: `blog-color ${preset}`, 'data-color': hex }, 0]
      : ['span', { class: 'blog-color', 'data-color': hex, style: `--blog-color: ${hex}` }, 0]
  },
})

/** Highlight. Priority above the text color so it is the outer element, as in the reader. */
export const Highlight = Mark.create({
  name: 'highlight',
  priority: 110,
  addAttributes: colorAttrs,
  parseHTML() {
    return [{ tag: 'span.blog-hl[data-color]', getAttrs: validMarker }]
  },
  renderHTML({ mark }) {
    const hex = normalizeHex(mark.attrs.color)
    if (!hex) return ['span', 0]
    return ['span', { class: 'blog-hl', 'data-color': hex, style: `--blog-hl: ${hex}; --blog-hl-ink: ${readableInk(hex)}` }, 0]
  },
})

// Subscript and superscript never sit on the same text.
export const BlogSubscript = Subscript.extend({ excludes: 'subscript superscript' })
export const BlogSuperscript = Superscript.extend({ excludes: 'subscript superscript' })

/** A span from pasted HTML: an integer within 1..max, else 1 (the same bounds as the stored schema). */
function spanAttr(name: string, max: number) {
  return {
    default: 1,
    parseHTML: (el: HTMLElement) => {
      const n = Number.parseInt(el.getAttribute(name) ?? '', 10)
      return Number.isInteger(n) && n >= 1 && n <= max ? n : 1
    },
  }
}

function cellAttributes() {
  return {
    colspan: spanAttr('colspan', MAX_TABLE_COLS),
    rowspan: spanAttr('rowspan', MAX_TABLE_ROWS),
  }
}

// A cell holds one paragraph, and only colspan and rowspan are kept (no widths, no alignment).
export const BlogTableCell = TableCell.extend({ content: 'paragraph', addAttributes: cellAttributes })
export const BlogTableHeader = TableHeader.extend({ content: 'paragraph', addAttributes: cellAttributes })

// A task item holds one paragraph and cannot nest.
export const BlogTaskItem = TaskItem.extend({ content: 'paragraph' }).configure({ nested: false })

/** True when the selection is a rectangle of two or more cells that can be merged. */
export function canMergeCells(state: EditorState): boolean {
  return state.selection instanceof CellSelection && mergeCells(state)
}

/**
 * Merges the selected cells into the first one. A cell holds one paragraph, so the text of the other
 * cells is first moved (joined with a space) into the first cell's paragraph and their paragraphs are
 * emptied; prosemirror-tables then merges the empty cells. One transaction, so Undo restores everything.
 */
export function mergeSelectedCells(state: EditorState, dispatch: (tr: Transaction) => void): boolean {
  const sel = state.selection
  if (!(sel instanceof CellSelection) || !mergeCells(state)) return false
  const cells: { pos: number; node: PMNode }[] = []
  sel.forEachCell((node, pos) => cells.push({ pos, node }))
  const tr = state.tr
  let moved = Fragment.empty
  // Later cells first, so the positions of the earlier ones stay valid while deleting.
  for (let i = cells.length - 1; i >= 1; i--) {
    const { pos, node } = cells[i]
    const para = node.firstChild
    if (!para || para.content.size === 0) continue
    moved = moved.size ? para.content.append(Fragment.from(state.schema.text(' '))).append(moved) : para.content
    tr.delete(pos + 2, pos + 2 + para.content.size)
  }
  if (moved.size) {
    const first = cells[0]
    const para = first.node.firstChild
    const end = first.pos + 2 + (para ? para.content.size : 0)
    const lead = para && para.content.size ? Fragment.from(state.schema.text(' ')).append(moved) : moved
    tr.insert(end, lead)
  }
  tr.setSelection(CellSelection.create(tr.doc, tr.mapping.map(sel.$anchorCell.pos), tr.mapping.map(sel.$headCell.pos)))
  const next = state.apply(tr)
  let merged: Transaction | undefined
  mergeCells(next, (t) => {
    merged = t
  })
  if (!merged) return false
  const second: Transaction = merged
  const done = state.tr
  for (const step of tr.steps) done.step(step)
  for (const step of second.steps) done.step(step)
  done.setSelection(Selection.fromJSON(done.doc, second.selection.toJSON()))
  dispatch(done.scrollIntoView())
  return true
}
