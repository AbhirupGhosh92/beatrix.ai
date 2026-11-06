'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  JSON_KINDS,
  addChild,
  convert,
  isContainer,
  kindOf,
  matchesSearch,
  moveItem,
  parseDocument,
  parseNumber,
  removeAt,
  renameKey,
  setAt,
  stringify,
} from '../../lib/jsonTree.ts'
import type { JsonKind, JsonPath, JsonValue } from '../../lib/jsonTree.ts'

interface JsonTreeEditorProps {
  value: string
  onChange: (value: string) => void
  /** Rows deeper than this start collapsed (Infinity expands everything). */
  openDepth?: number
  /** Show only rows whose key or value (or a descendant's) contains this text. */
  search?: string
  /** Accessible name of the tree. */
  label?: string
}

type Update = (apply: (root: JsonValue) => JsonValue) => void

/** An input that keeps what the user typed while the document holds an equivalent value. */
function DraftInput({
  value,
  same,
  validate,
  onCommit,
  label,
  className,
}: {
  value: string
  same: (text: string, value: string) => boolean
  validate: (text: string) => string | null
  onCommit: (text: string) => void
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft !== null && same(draft, value) ? draft : value
  const error = draft !== null && same(draft, value) ? null : draft !== null ? validate(draft) : null
  return (
    <span className="flex min-w-0 flex-col">
      <input
        type="text"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        className={`input input-bordered input-xs font-mono ${error ? 'input-error' : ''} ${className ?? ''}`}
        value={error ? draft! : text}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          if (validate(next) === null) onCommit(next)
        }}
        onBlur={() => setDraft(null)}
      />
      {error && (
        <span role="alert" className="text-error text-xs">
          {error}
        </span>
      )}
    </span>
  )
}

interface NodeProps {
  value: JsonValue
  path: JsonPath
  keyName: string | number | null
  parentKind: 'map' | 'array' | null
  index: number
  siblings: number
  depth: number
  openDepth: number
  search: string
  update: Update
  root: JsonValue
}

function summary(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.length}]`
  if (isContainer(value)) return `{${Object.keys(value).length}}`
  return ''
}

function TreeNode({ value, path, keyName, parentKind, index, siblings, depth, openDepth, search, update, root }: NodeProps) {
  const kind = kindOf(value)
  const container = isContainer(value)
  const searching = search.trim() !== ''
  const [openState, setOpenState] = useState(depth < openDepth)
  const open = searching || openState
  const label = keyName === null ? 'root' : String(keyName)

  const entries: [string | number, JsonValue][] = Array.isArray(value)
    ? value.map((item, i) => [i, item])
    : container
      ? Object.entries(value as { [key: string]: JsonValue })
      : []
  const childKind = kind === 'map' || kind === 'array' ? kind : null

  return (
    <li role="treeitem" aria-expanded={container ? open : undefined} aria-selected={false} aria-label={label}>
      <div className="flex flex-wrap items-start gap-1 py-0.5">
        {container ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
            aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
            onClick={() => setOpenState((on) => !on)}
            disabled={searching}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="inline-block w-6" aria-hidden />
        )}

        {parentKind === 'map' && typeof keyName === 'string' && (
          <DraftInput
            label={`Key of ${label}`}
            value={keyName}
            same={(text, current) => text === current}
            validate={(text) => {
              const result = renameKey(root, path, text)
              return result.ok ? null : result.error
            }}
            onCommit={(text) => update((r) => {
              const result = renameKey(r, path, text)
              return result.ok ? result.root : r
            })}
            className="w-32 sm:w-44"
          />
        )}
        {parentKind === 'array' && <span className="text-muted w-8 pt-1 text-xs font-mono">{index}</span>}
        {keyName === null && <span className="text-muted pt-1 text-xs font-mono">root</span>}

        <select
          aria-label={`Type of ${label}`}
          className="select select-bordered select-xs bg-base-100 w-24"
          value={kind}
          onChange={(event) => update((r) => setAt(r, path, convert(value, event.target.value as JsonKind)))}
        >
          {JSON_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {kind === 'string' && (
          <DraftInput
            label={`Value of ${label}`}
            value={value as string}
            same={(text, current) => text === current}
            validate={() => null}
            onCommit={(text) => update((r) => setAt(r, path, text))}
            className="w-48 sm:w-72"
          />
        )}
        {kind === 'number' && (
          <DraftInput
            label={`Value of ${label}`}
            value={String(value)}
            same={(text, current) => parseNumber(text) !== null && parseNumber(text) === Number(current)}
            validate={(text) => (parseNumber(text) === null ? 'Enter a number.' : null)}
            onCommit={(text) => update((r) => setAt(r, path, Number(text)))}
            className="w-32"
          />
        )}
        {kind === 'boolean' && (
          <select
            aria-label={`Value of ${label}`}
            className="select select-bordered select-xs bg-base-100 w-24"
            value={String(value)}
            onChange={(event) => update((r) => setAt(r, path, event.target.value === 'true'))}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        )}
        {kind === 'null' && <span className="text-muted pt-1 text-xs font-mono">null</span>}
        {container && <span className="text-muted pt-1 text-xs font-mono">{summary(value)}</span>}

        <span className="ml-auto flex items-center gap-0.5">
          {container && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              aria-label={`Add entry to ${label}`}
              title="Add entry"
              onClick={() => {
                setOpenState(true)
                update((r) => addChild(r, path))
              }}
            >
              <Plus size={14} />
            </button>
          )}
          {parentKind === 'array' && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                aria-label={`Move ${label} up`}
                title="Move up"
                disabled={index === 0}
                onClick={() => update((r) => moveItem(r, path, -1))}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                aria-label={`Move ${label} down`}
                title="Move down"
                disabled={index === siblings - 1}
                onClick={() => update((r) => moveItem(r, path, 1))}
              >
                <ArrowDown size={14} />
              </button>
            </>
          )}
          {parentKind !== null && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              aria-label={`Remove ${label}`}
              title="Remove"
              onClick={() => update((r) => removeAt(r, path))}
            >
              <Trash2 size={14} />
            </button>
          )}
        </span>
      </div>

      {container && open && entries.length > 0 && (
        <ul role="group" className="border-base-300 ml-3 border-l pl-3 sm:ml-5 sm:pl-4">
          {entries
            .filter(([k, v]) => !searching || matchesSearch(v, k, search))
            .map(([k, v]) => (
              <TreeNode
                key={`${k}`}
                value={v}
                path={[...path, k]}
                keyName={k}
                parentKind={childKind}
                index={typeof k === 'number' ? k : entries.findIndex(([ek]) => ek === k)}
                siblings={entries.length}
                depth={depth + 1}
                openDepth={openDepth}
                search={search}
                update={update}
                root={root}
              />
            ))}
        </ul>
      )}
    </li>
  )
}

export function JsonTreeEditor({ value, onChange, openDepth = 1, search = '', label = 'JSON tree' }: JsonTreeEditorProps) {
  const parsed = parseDocument(value)
  if (!parsed.ok) {
    return (
      <div className="text-error flex h-64 items-center justify-center font-sans" role="alert">
        Cannot display Tree View: fix the syntax in the Code view first.
      </div>
    )
  }
  const root = parsed.value
  const update: Update = (apply) => onChange(stringify(apply(root)))
  return (
    <ul role="tree" aria-label={label} className="text-sm">
      <TreeNode
        value={root}
        path={[]}
        keyName={null}
        parentKind={null}
        index={0}
        siblings={1}
        depth={0}
        openDepth={openDepth}
        search={search}
        update={update}
        root={root}
      />
    </ul>
  )
}
