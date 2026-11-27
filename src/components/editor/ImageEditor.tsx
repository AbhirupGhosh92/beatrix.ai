'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from 'lucide-react'
import {
  FULL_RECT,
  canEditType,
  encodeCanvas,
  extensionFor,
  isFullRect,
  loadImage,
  moveRect,
  orient,
  rectAfter,
  renderEdit,
  resizeRect,
  sizeRect,
  toCanvas,
} from './imageTransform.ts'
import type { EditOp, Handle, LoadedImage, Rect } from './imageTransform.ts'

// The image editing dialog: rotate by 90 degrees, flip, crop. The crop box is hand-written: pointer drag
// on the box and on eight handles, and the keyboard (arrows move it, Shift plus arrows resize it).

const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const PREVIEW_SIDE = 1000
/** One arrow-key step, as a fraction of the picture. */
const STEP = 0.01

interface Props {
  /** The same-origin address of the image being edited. */
  url: string
  /** The image was edited before in this session: Reset goes back to the first version. */
  canReset: boolean
  /** Reset to the first version (no upload). */
  onReset: () => void
  /** Stores the edited image and swaps it into the post; rejects with the reason when it could not. */
  onApply: (blob: Blob, extension: string) => Promise<void>
  onClose: () => void
}

const messageOf = (err: unknown): string =>
  err instanceof Error && err.message
    ? err.message
    : err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message
      ? err.message
      : 'The image could not be saved.'

interface Drag {
  x: number
  y: number
  rect: Rect
  handle: Handle | null
}

export default function ImageEditor({ url, canReset, onReset, onApply, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)

  const [loaded, setLoaded] = useState<LoadedImage | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ops, setOps] = useState<EditOp[]>([])
  const [crop, setCrop] = useState<Rect>(FULL_RECT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    let cancelled = false
    loadImage(url)
      .then((result) => {
        if (!cancelled) setLoaded(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(messageOf(err))
      })
    return () => {
      cancelled = true
    }
  }, [url])

  const editable = loaded ? canEditType(loaded.type) : false
  const base = useMemo(() => {
    if (!loaded || !editable) return null
    try {
      return { canvas: toCanvas(loaded.image, PREVIEW_SIDE) }
    } catch (err) {
      return { error: messageOf(err) }
    }
  }, [loaded, editable])
  const preview = useMemo(() => {
    if (!base) return null
    if ('error' in base) return base
    try {
      return { canvas: orient(base.canvas, ops) }
    } catch (err) {
      return { error: messageOf(err) }
    }
  }, [base, ops])

  const previewCanvas = preview && 'canvas' in preview ? preview.canvas : null
  useEffect(() => {
    const target = canvasRef.current
    if (!target || !previewCanvas) return
    target.width = previewCanvas.width
    target.height = previewCanvas.height
    target.getContext('2d')?.drawImage(previewCanvas, 0, 0)
  }, [previewCanvas])

  const reason = loadError ?? (loaded && !editable ? 'This image cannot be edited (animated GIFs and other types are not supported).' : null)
  const problem = reason ?? (preview && 'error' in preview ? preview.error : null)
  const changed = ops.length > 0 || !isFullRect(crop)
  const ready = previewCanvas !== null && !problem

  const apply = (op: EditOp) => {
    setOps((list) => [...list, op])
    setCrop((rect) => rectAfter(rect, op))
  }

  // ---- crop box ----
  const begin = (event: PointerEvent<HTMLElement>, handle: Handle | null) => {
    if (busy || !ready) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, rect: crop, handle }
  }
  const dragTo = (event: PointerEvent<HTMLElement>) => {
    const d = drag.current
    const box = stageRef.current?.getBoundingClientRect()
    if (!d || !box || box.width === 0 || box.height === 0) return
    const dx = (event.clientX - d.x) / box.width
    const dy = (event.clientY - d.y) / box.height
    setCrop(d.handle ? resizeRect(d.rect, d.handle, dx, dy) : moveRect(d.rect, dx, dy))
  }
  const end = () => {
    drag.current = null
  }

  const onBoxKey = (event: KeyboardEvent<HTMLElement>) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
    if (!dir || busy) return
    event.preventDefault()
    setCrop((rect) => (event.shiftKey ? sizeRect(rect, dir[0] * STEP, dir[1] * STEP) : moveRect(rect, dir[0] * STEP, dir[1] * STEP)))
  }

  const reset = () => {
    if (canReset) {
      onReset()
      onClose()
      return
    }
    setOps([])
    setCrop(FULL_RECT)
    setError(null)
  }

  const save = async () => {
    if (!loaded || !ready || busy) return
    setBusy(true)
    setError(null)
    try {
      const blob = await encodeCanvas(renderEdit(loaded.image, ops, crop), loaded.type)
      await onApply(blob, extensionFor(loaded.type))
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
      return
    }
    onClose()
  }

  // Focus stays inside the dialog: Tab wraps at both ends (the modal dialog also makes the page inert).
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const tool = (label: string, Icon: typeof RotateCw, op: EditOp) => (
    <button key={op} type="button" className="editor-tool" aria-label={label} title={label} disabled={!ready || busy} onClick={() => apply(op)}>
      <Icon size={18} aria-hidden="true" />
    </button>
  )

  return (
    <dialog
      ref={dialogRef}
      className="image-editor"
      aria-labelledby="image-editor-title"
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="image-editor-title" className="image-editor-title">
        Edit image
      </h2>
      <div className="image-editor-tools" role="group" aria-label="Image tools">
        {tool('Rotate left', RotateCcw, 'rotate-left')}
        {tool('Rotate right', RotateCw, 'rotate-right')}
        {tool('Flip horizontally', FlipHorizontal2, 'flip-h')}
        {tool('Flip vertically', FlipVertical2, 'flip-v')}
      </div>

      <div className="image-editor-view">
        {!loaded && !loadError && <p className="text-muted">Loading the image...</p>}
        {problem && (
          <p role="alert" className="image-editor-error">
            {problem}
          </p>
        )}
        {ready && (
          <div ref={stageRef} className="image-stage">
            <canvas ref={canvasRef} className="image-stage-canvas" aria-label="Preview of the edited image" role="img" />
            <div
              className="image-crop"
              role="group"
              tabIndex={0}
              aria-label="Crop area. Arrow keys move it, Shift with arrow keys resizes it."
              style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
              onPointerDown={(event) => begin(event, null)}
              onPointerMove={dragTo}
              onPointerUp={end}
              onPointerCancel={end}
              onKeyDown={onBoxKey}
            >
              {HANDLES.map((handle) => (
                <span
                  key={handle}
                  className={`image-crop-handle image-crop-handle-${handle}`}
                  aria-hidden="true"
                  onPointerDown={(event) => begin(event, handle)}
                  onPointerMove={dragTo}
                  onPointerUp={end}
                  onPointerCancel={end}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="image-editor-error">
          {error} The image was not changed.
        </p>
      )}

      <div className="image-editor-actions">
        <button type="button" className="button-secondary" disabled={busy || (!canReset && !changed)} onClick={reset}>
          {canReset ? 'Reset to original' : 'Reset changes'}
        </button>
        <span className="image-editor-actions-end">
          <button type="button" className="button-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button-primary" disabled={!ready || !changed || busy} onClick={() => void save()}>
            {busy ? 'Saving...' : 'Apply'}
          </button>
        </span>
      </div>
    </dialog>
  )
}
