'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronDown, Cloud, CloudOff, CloudUpload, Download, Loader2, Pencil, Save } from 'lucide-react'
import { FORMATS, type ExportFormat } from '../../lib/resume/export.ts'

export type SyncState = 'saved' | 'dirty' | 'saving' | 'error'

interface Props {
  title: string
  onTitleChange: (title: string) => void
  sync: SyncState
  syncText: string
  /** Base users save with a button; advanced users have autosave. */
  showSave: boolean
  onSave: () => void
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  downloading: boolean
  downloadDisabled: boolean
  onDownload: () => void
  onLeave: () => void
}

const SYNC_ICON = {
  saved: <Cloud size={18} aria-hidden />,
  dirty: <CloudUpload size={18} aria-hidden />,
  saving: <Loader2 size={18} className="animate-spin" aria-hidden />,
  error: <CloudOff size={18} aria-hidden />,
} as const

// Breadcrumb with inline rename, sync state and the download control.
export default function WorkspaceHeader({
  title,
  onTitleChange,
  sync,
  syncText,
  showSave,
  onSave,
  format,
  onFormatChange,
  downloading,
  downloadDisabled,
  onDownload,
  onLeave,
}: Props) {
  const [menu, setMenu] = useState(false)
  const label = FORMATS.find((f) => f.id === format)?.label ?? format

  // A click anywhere else closes the format menu. The toggle stops its own click from reaching here.
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menu])

  return (
    <header className="flex flex-wrap items-center gap-2 sm:gap-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2">
        <button type="button" className="btn-sm button-secondary shrink-0" onClick={onLeave}>
          <ArrowLeft size={14} /> <span className="hidden sm:inline">My resumes</span>
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="sr-only">Resume name</span>
          <input
            className="input input-bordered input-sm w-full min-w-0 max-w-md"
            maxLength={80}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <Pencil size={14} className="shrink-0 text-muted" aria-hidden />
        </label>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-meta" role="status" title={syncText}>
          {SYNC_ICON[sync]}
          <span className="sr-only sm:not-sr-only">{syncText}</span>
        </span>
        {showSave && (
          <button type="button" className="btn-sm button-secondary" disabled={sync !== 'dirty'} onClick={onSave}>
            <Save size={14} /> Save
          </button>
        )}
        <div className="relative flex" onKeyDown={(event) => event.key === 'Escape' && setMenu(false)}>
          <button type="button" className="btn-sm button-primary" disabled={downloadDisabled || downloading} onClick={onDownload}>
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download {label}
          </button>
          <button
            type="button"
            className="btn-square btn-sm button-secondary"
            aria-label="Choose download format"
            aria-expanded={menu}
            aria-haspopup="listbox"
            onClick={(event) => {
              event.stopPropagation()
              setMenu((open) => !open)
            }}
          >
            <ChevronDown size={14} />
          </button>
          {menu && (
            <ul role="listbox" aria-label="Download format" className="surface rounded-box absolute right-0 top-full z-40 mt-1 flex min-w-40 flex-col gap-1 p-1 shadow-lg">
              {FORMATS.map((f) => (
                <li key={f.id} role="option" aria-selected={f.id === format}>
                  <button
                    type="button"
                    className={`w-full justify-start btn-sm ${f.id === format ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => {
                      onFormatChange(f.id)
                      setMenu(false)
                    }}
                  >
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  )
}
