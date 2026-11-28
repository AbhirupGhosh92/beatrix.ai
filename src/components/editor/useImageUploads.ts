'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import type { UploadItem } from './UploadStatus.tsx'
import { placeholderPos, uploadPlaceholderKey } from './uploadPlaceholder.ts'
import type { RichEditorHost } from './types.ts'

// The image upload queue of the editor: picker, drop and paste all end up in `enqueue`. Files are
// checked first (type, size, remaining count), then uploaded one at a time through the host, each
// replacing its placeholder widget (uploadPlaceholder.ts) with the image node.

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

interface Job {
  id: string
  file: File
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
  }
  return `${Math.floor(bytes / 1024)} KB`
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })
}

const altOf = (name: string) =>
  Array.from(name.replace(/\.[^.]*$/, ''))
    .slice(0, 500)
    .join('')

const messageOf = (err: unknown): string => {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) return err.message
  return 'the upload failed.'
}

export interface ImageUploads {
  items: UploadItem[]
  /** Uploads and queued files not yet finished. */
  pending: () => number
  /** Saves a never-saved document once (shared while a save runs); `needed` says whether it did. */
  prepare: () => { needed: false } | { needed: true; done: Promise<boolean> }
  /** Checks the files and queues the valid ones for `pos` (the cursor when null). `saved`: prepare already ran. */
  enqueue: (files: File[], pos: number | null, saved?: boolean) => void
  dismiss: (id: string) => void
}

export function useImageUploads(editor: Editor | null, hostRef: RefObject<RichEditorHost>): ImageUploads {
  const [items, setItems] = useState<UploadItem[]>([])
  const editorRef = useRef(editor)
  const queue = useRef<Job[]>([])
  const running = useRef(false)
  const counter = useRef(0)
  const pendingCount = useRef(0)
  const saving = useRef<Promise<boolean> | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    editorRef.current = editor
  }, [editor])
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      queue.current = []
    }
  }, [])

  const active = items.some((item) => item.status !== 'error')
  useEffect(() => {
    hostRef.current.onUploadingChange?.(active)
  }, [active, hostRef])

  const patch = useCallback((id: string, change: Partial<UploadItem>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)))
  }, [])
  const drop = useCallback((id: string) => {
    setItems((list) => list.filter((item) => item.id !== id))
  }, [])

  const removeWidget = useCallback((id: string) => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    ed.view.dispatch(ed.state.tr.setMeta(uploadPlaceholderKey, { remove: id }))
  }, [])

  const run = useCallback(async () => {
    if (running.current) return
    running.current = true
    while (queue.current.length > 0 && alive.current) {
      const job = queue.current.shift() as Job
      patch(job.id, { status: 'uploading' })
      try {
        const dataBase64 = await readBase64(job.file)
        const image = await hostRef.current.images.upload({ name: job.file.name, dataBase64, uploadId: job.id })
        const ed = editorRef.current
        if (ed && !ed.isDestroyed) {
          const at = placeholderPos(ed.state, job.id) ?? ed.state.selection.to
          const before = ed.state.selection
          ed.chain()
            .command(({ tr }) => {
              tr.setMeta(uploadPlaceholderKey, { remove: job.id })
              return true
            })
            .insertContentAt(at, { type: 'image', attrs: { imageId: image.id, alt: altOf(image.name) } })
            // Typing elsewhere during the upload keeps its cursor: the selection is carried over the insertion.
            .command(({ tr }) => {
              tr.setSelection(before.map(tr.doc, tr.mapping))
              return true
            })
            .run()
        }
        pendingCount.current -= 1
        drop(job.id)
      } catch (err) {
        // The text is untouched: only the placeholder goes away.
        removeWidget(job.id)
        pendingCount.current -= 1
        patch(job.id, { status: 'error', error: `${job.file.name}: ${messageOf(err)}` })
      }
    }
    running.current = false
  }, [drop, hostRef, patch, removeWidget])

  const prepare = useCallback((): { needed: false } | { needed: true; done: Promise<boolean> } => {
    const { images } = hostRef.current
    if (!images.ensureSaved || (images.needsSave && !images.needsSave())) return { needed: false }
    if (!saving.current) {
      const ensure = images.ensureSaved
      saving.current = ensure().finally(() => {
        saving.current = null
      })
    }
    return { needed: true, done: saving.current }
  }, [hostRef])

  const enqueue = useCallback(
    (files: File[], pos: number | null, saved = false) => {
      const ed = editorRef.current
      if (!ed || ed.isDestroyed) return
      const { images, onError } = hostRef.current
      let free = images.limits.remaining() - pendingCount.current
      const jobs: Job[] = []
      for (const file of files) {
        const reason = !ALLOWED_TYPES.has(file.type)
          ? 'only PNG, JPEG, WebP or GIF images are allowed.'
          : file.size > images.limits.maxBytes
            ? `over the ${formatBytes(images.limits.maxBytes)} limit.`
            : free <= 0
              ? 'no more images can be added.'
              : null
        if (reason) {
          onError(`${file.name}: ${reason}`)
          continue
        }
        free -= 1
        jobs.push({ id: `upload-${(counter.current += 1)}`, file })
      }
      if (jobs.length === 0) return

      const at = Math.min(pos ?? ed.state.selection.to, ed.state.doc.content.size)
      for (const job of jobs) {
        ed.view.dispatch(
          ed.state.tr.setMeta(uploadPlaceholderKey, { add: { uploadId: job.id, pos: at, name: job.file.name, order: Number(job.id.slice(7)) } }),
        )
      }
      pendingCount.current += jobs.length
      setItems((list) => [...list, ...jobs.map((job): UploadItem => ({ id: job.id, name: job.file.name, status: 'queued' }))])

      const start = () => {
        queue.current.push(...jobs)
        void run()
      }
      const step = saved ? ({ needed: false } as const) : prepare()
      if (!step.needed) {
        start()
        return
      }
      // A never-saved document is saved as a draft once, before the first file; the editor is not remounted.
      void step.done.then((ok) => {
        if (ok && alive.current) {
          start()
          return
        }
        for (const job of jobs) {
          removeWidget(job.id)
          drop(job.id)
        }
        pendingCount.current -= jobs.length
      })
    },
    [drop, hostRef, prepare, removeWidget, run],
  )

  const pending = useCallback(() => pendingCount.current, [])

  return { items, pending, prepare, enqueue, dismiss: drop }
}
