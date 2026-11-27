'use client'

import { useSyncExternalStore } from 'react'
import { getUploadProgress, getUploadProgressVersion, subscribeUploadProgress } from '../../lib/blogUploadProgress.ts'

export interface UploadItem {
  id: string
  name: string
  status: 'queued' | 'uploading' | 'error'
  /** Set when status is 'error'. */
  error?: string
}

interface Props {
  items: UploadItem[]
  onDismiss: (id: string) => void
}

function UploadRow({ item, onDismiss }: { item: UploadItem; onDismiss: (id: string) => void }) {
  // Re-render on every progress tick; the value itself is read from the client-only store.
  useSyncExternalStore(subscribeUploadProgress, getUploadProgressVersion, getUploadProgressVersion)
  const progress = item.status === 'uploading' ? getUploadProgress(item.id) : undefined
  const percent = progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : null

  if (item.status === 'error') {
    return (
      <li className="upload-status-row upload-status-error" role="alert">
        <span className="min-w-0 break-words">{item.error ?? `${item.name}: the upload failed.`}</span>
        <button type="button" className="button-secondary" onClick={() => onDismiss(item.id)}>
          Dismiss
        </button>
      </li>
    )
  }
  return (
    <li className="upload-status-row">
      <span className="min-w-0 truncate">{item.name}</span>
      {item.status === 'queued' ? (
        <span className="text-meta">Waiting</span>
      ) : (
        <>
          <progress
            className="progress upload-status-bar"
            aria-label={`Uploading ${item.name}`}
            max={100}
            {...(percent !== null ? { value: percent } : {})}
          />
          <span className="text-meta">{percent !== null ? `${percent}%` : 'Starting'}</span>
        </>
      )}
    </li>
  )
}

/** The upload queue under the editor: a bar per file, an error line with Dismiss. */
export default function UploadStatus({ items, onDismiss }: Props) {
  return (
    <ul className="upload-status" aria-live="polite" aria-label="Image uploads">
      {items.map((item) => (
        <UploadRow key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </ul>
  )
}
