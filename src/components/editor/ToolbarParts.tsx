'use client'

import { useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { charCount, isHttpsImageUrl } from '../../lib/blogDoc.ts'
import { COLOR_PRESETS, HIGHLIGHT_PRESETS } from './blogTextExtensions.ts'

// The pieces of the fixed editor toolbar (EditorToolbar.tsx): the button, the color panel, the link form
// and the image-by-URL form. The panels open as one row under the toolbar.

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

interface ToolButtonProps {
  /** Stable id: the roving tab stop is tracked by it. */
  id: string
  label: string
  /** Shown in the tooltip, e.g. `Ctrl/Cmd+B`. */
  shortcut?: string
  icon: ReactNode
  /** A toggle shows its state through `aria-pressed`; leave undefined for a plain action. */
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

/** One toolbar button: icon, accessible name, tooltip, native disabled. Mouse-down never steals the editor selection. */
export function ToolButton({ id, label, shortcut, icon, active, disabled = false, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      className="editor-tool"
      data-tool-id={id}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

interface ColorPickerProps {
  kind: 'color' | 'highlight'
  /** The color of the selection now (#rrggbb) or '' when none. */
  current: string
  onPick: (hex: string) => void
  onRemove: () => void
  onClose: () => void
}

/** Named preset swatches, a native color input for a free choice, and Remove. */
export function ColorPicker({ kind, current, onPick, onRemove, onClose }: ColorPickerProps) {
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

interface LinkFormProps {
  initial: string
  /** The selection already is a link: Remove link is offered. */
  hasLink: boolean
  onApply: (value: string) => void
  onRemove: () => void
  onClose: () => void
}

export function LinkForm({ initial, hasLink, onApply, onRemove, onClose }: LinkFormProps) {
  const [value, setValue] = useState(initial)
  return (
    <div className="editor-link-form">
      <label className="sr-only" htmlFor="editor-link-input">
        Link address
      </label>
      <input
        id="editor-link-input"
        className="input input-bordered min-w-0 flex-1"
        placeholder="https://example.com"
        value={value}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onApply(value)
          }
        }}
      />
      <button type="button" className="button-primary" onClick={() => onApply(value)}>
        Apply
      </button>
      {hasLink && (
        <button type="button" className="button-secondary" onClick={onRemove}>
          Remove link
        </button>
      )}
      <button type="button" className="button-secondary" onClick={onClose}>
        Cancel
      </button>
    </div>
  )
}

interface ImageUrlFormProps {
  /** The configured limit of an image address, in characters. */
  maxUrlLength: number
  onInsert: (src: string, alt: string | null) => void
  onClose: () => void
  onError: (message: string) => void
}

/** The By URL image form: an https address (within the limit) and an optional description. */
export function ImageUrlForm({ maxUrlLength, onInsert, onClose, onError }: ImageUrlFormProps) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')

  const insert = () => {
    const src = url.trim()
    if (charCount(src) > maxUrlLength) {
      onError(`The image address is too long (limit ${maxUrlLength} characters).`)
      return
    }
    if (!isHttpsImageUrl(src)) {
      onError('Image addresses must start with https:// and have no spaces.')
      return
    }
    const description = alt.trim()
    if (charCount(description) > 500) {
      onError('The image description is over the limit of 500 characters.')
      return
    }
    onInsert(src, description || null)
  }

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      insert()
    }
  }

  return (
    <div className="editor-link-form">
      <label className="sr-only" htmlFor="editor-image-url">
        Image address
      </label>
      <input
        id="editor-image-url"
        className="input input-bordered min-w-0 flex-1"
        placeholder="https://example.com/picture.png"
        value={url}
        autoFocus
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={keys}
      />
      <label className="sr-only" htmlFor="editor-image-alt">
        Image description
      </label>
      <input
        id="editor-image-alt"
        className="input input-bordered min-w-0 flex-1"
        placeholder="Description (alt text)"
        value={alt}
        onChange={(event) => setAlt(event.target.value)}
        onKeyDown={keys}
      />
      <button type="button" className="button-primary" onClick={insert}>
        Insert
      </button>
      <button type="button" className="button-secondary" onClick={onClose}>
        Cancel
      </button>
    </div>
  )
}
