'use client'

import { useState } from 'react'
import { FilePlus, FileText, Trash2 } from 'lucide-react'
import type { ResumeSummary } from '../../lib/resumeTypes.ts'

interface Props {
  resumes: ResumeSummary[]
  /** Resumes allowed, or null for no cap. */
  cap: number | null
  busy: boolean
  error: string | null
  onOpen: (id: string) => void
  onCreate: (title: string) => void
  onDelete: (id: string) => void
}

export default function ResumeList({ resumes, cap, busy, error, onOpen, onCreate, onDelete }: Props) {
  const [title, setTitle] = useState('My resume')
  const [confirming, setConfirming] = useState<string | null>(null)
  const atCap = cap !== null && resumes.length >= cap

  return (
    <div className="flex flex-col gap-6">
      <form
        className="surface rounded-box flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          if (!atCap && title.trim()) onCreate(title.trim())
        }}
      >
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-meta-strong font-semibold">New resume</span>
          <input className="input input-bordered w-full" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <button type="submit" className="button-primary" disabled={busy || atCap || title.trim() === ''}>
          <FilePlus size={16} /> Create
        </button>
        <p className="text-meta sm:w-40" aria-live="polite">
          {cap === null ? `${resumes.length} resumes` : `${resumes.length} of ${cap} used`}
          {atCap && ' - delete one to create another'}
        </p>
      </form>

      {error && <p role="alert" className="text-error">{error}</p>}

      {resumes.length === 0 ? (
        <p className="text-muted">You have no resumes yet. Create your first one above.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {resumes.map((resume) => (
            <li key={resume.id} className="surface rounded-box flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{resume.title}</p>
                <p className="text-meta">Updated {resume.updatedAt ? new Date(resume.updatedAt).toLocaleString() : '-'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="button-primary" onClick={() => onOpen(resume.id)}>
                  <FileText size={16} /> Open
                </button>
                {confirming === resume.id ? (
                  <>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={busy}
                      onClick={() => {
                        setConfirming(null)
                        onDelete(resume.id)
                      }}
                    >
                      Confirm delete
                    </button>
                    <button type="button" className="button-accent" onClick={() => setConfirming(null)}>Cancel</button>
                  </>
                ) : (
                  <button type="button" className="button-secondary" onClick={() => setConfirming(resume.id)} aria-label={`Delete ${resume.title}`}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
