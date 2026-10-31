'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, FilePlus, FileText, Loader2, Save, Trash2, X } from 'lucide-react'
import type { TrackerStatus } from '../../data/resumeConfig.ts'
import { applicationApi } from '../../lib/applicationClient.ts'
import type { ApplicationSummary, TrackerLimits } from '../../lib/applicationTypes.ts'
import LabelInput from './LabelInput.tsx'

interface Props {
  /** The application being edited, or null for a new one. */
  application: ApplicationSummary | null
  statuses: TrackerStatus[]
  limits: TrackerLimits
  suggestions: string[]
  onSaved: (application: ApplicationSummary) => void
  onDeleted: (id: string) => void
  onClose: () => void
}

interface Draft {
  company: string
  role: string
  jobUrl: string
  status: string
  appliedAt: string
  notes: string
  labels: string[]
  tailor: string
}

const today = () => new Date().toISOString().slice(0, 10)

function fromApplication(a: ApplicationSummary | null, statuses: TrackerStatus[]): Draft {
  return {
    company: a?.company ?? '',
    role: a?.role ?? '',
    jobUrl: a?.jobUrl ?? '',
    status: a?.status ?? statuses[0]?.id ?? '',
    appliedAt: a?.appliedAt ?? today(),
    notes: a?.notes ?? '',
    labels: a?.labels ?? [],
    tailor: '',
  }
}

export default function ApplicationForm({ application, statuses, limits, suggestions, onSaved, onDeleted, onClose }: Props) {
  const [draft, setDraft] = useState<Draft>(() => fromApplication(application, statuses))
  const [saved, setSaved] = useState<Draft>(draft)
  const [loadingTailor, setLoadingTailor] = useState(Boolean(application?.hasTailor))
  const [current, setCurrent] = useState<ApplicationSummary | null>(application)
  // The application as opened: the tailor JSON is loaded once for it, not after every save.
  const [opened] = useState(application)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  // The tailor JSON is not in the list; load it when an application that has one is opened.
  useEffect(() => {
    if (!opened?.hasTailor) return
    let ignore = false
    applicationApi
      .get(opened.id)
      .then(({ application: detail }) => {
        if (ignore) return
        const text = detail.tailor ? JSON.stringify(detail.tailor, null, 2) : ''
        setDraft((d) => ({ ...d, tailor: text }))
        setSaved((d) => ({ ...d, tailor: text }))
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Could not load the tailor JSON.')
      })
      .finally(() => {
        if (!ignore) setLoadingTailor(false)
      })
    return () => {
      ignore = true
    }
  }, [opened])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      let tailor: unknown
      if (draft.tailor.trim() !== '') {
        try {
          tailor = JSON.parse(draft.tailor)
        } catch {
          throw new Error('The tailor JSON is not valid JSON.')
        }
      } else if (current?.hasTailor) {
        tailor = null // cleared in the form: remove it
      }
      const { company, role, jobUrl, status, appliedAt, notes, labels } = draft
      const input = { company, role, jobUrl, status, appliedAt, notes, labels, tailor }
      const { application: next } = current
        ? await applicationApi.update(current.id, input)
        : await applicationApi.create(input)
      setCurrent(next)
      setSaved({ ...draft, labels: next.labels })
      setDraft((d) => ({ ...d, labels: next.labels }))
      onSaved(next)
    })

  const createResume = () =>
    run(async () => {
      if (!current) return
      const { resumeId } = await applicationApi.createResume(current.id)
      const next = { ...current, resumeId }
      setCurrent(next)
      onSaved(next)
    })

  const remove = () =>
    run(async () => {
      if (!current) return
      await applicationApi.remove(current.id)
      onDeleted(current.id)
    })

  const canCreateResume = current !== null && current.hasTailor && !current.resumeId && !dirty

  return (
    <form
      className="surface rounded-box flex flex-col gap-4 p-4 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="heading-display text-lg font-bold text-brand">{current ? 'Edit application' : 'New application'}</h2>
        <button type="button" className="button-accent btn-square" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-meta-strong font-semibold">Company</span>
          <input className="input input-bordered w-full" required maxLength={100} value={draft.company} onChange={(e) => set('company', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-meta-strong font-semibold">Role</span>
          <input className="input input-bordered w-full" required maxLength={100} value={draft.role} onChange={(e) => set('role', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-meta-strong font-semibold">Status</span>
          <select className="select select-bordered w-full" value={draft.status} onChange={(e) => set('status', e.target.value)}>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-meta-strong font-semibold">Applied date</span>
          <input type="date" className="input input-bordered w-full" required value={draft.appliedAt} onChange={(e) => set('appliedAt', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-meta-strong font-semibold">Job posting link</span>
          <span className="flex items-center gap-2">
            <input
              type="url"
              className="input input-bordered w-full"
              maxLength={2000}
              placeholder="https://..."
              value={draft.jobUrl}
              onChange={(e) => set('jobUrl', e.target.value)}
            />
            {saved.jobUrl && saved.jobUrl === draft.jobUrl && (
              <a className="button-secondary shrink-0" href={saved.jobUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} /> Open
              </a>
            )}
          </span>
        </label>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-meta-strong font-semibold">Labels</span>
          <LabelInput labels={draft.labels} suggestions={suggestions} max={limits.maxLabels} maxLength={limits.maxLabelLength} onChange={(labels) => set('labels', labels)} />
        </div>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-meta-strong font-semibold">Notes</span>
          <textarea className="textarea textarea-bordered min-h-24 w-full" maxLength={limits.maxNotesLength} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-meta-strong font-semibold">Tailor JSON</span>
          <span className="text-meta">Resume data for this job, in the same shape as a resume. Leave empty if you have none.</span>
          <textarea
            className="textarea textarea-bordered min-h-40 w-full font-mono text-sm"
            spellCheck={false}
            disabled={loadingTailor}
            placeholder='{ "contact": { "name": "..." } }'
            value={loadingTailor ? 'Loading...' : draft.tailor}
            onChange={(e) => set('tailor', e.target.value)}
          />
        </label>
      </div>

      {error && <p role="alert" className="text-error">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="button-primary" disabled={busy || loadingTailor || draft.company.trim() === '' || draft.role.trim() === ''}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save
        </button>
        {current?.resumeId ? (
          <Link className="button-secondary" href={`/resume-builder?open=${current.resumeId}`}>
            <FileText size={16} /> Open tailored resume
          </Link>
        ) : (
          current?.hasTailor && (
            <button type="button" className="button-secondary" disabled={busy || !canCreateResume} onClick={() => void createResume()}>
              <FilePlus size={16} /> Create tailored resume
            </button>
          )
        )}
        {current && dirty && current.hasTailor && !current.resumeId && <span className="text-meta">Save your changes first.</span>}
        {current && (
          <span className="ml-auto flex items-center gap-2">
            {confirming ? (
              <>
                <button type="button" className="button-secondary" disabled={busy} onClick={() => void remove()}>Confirm delete</button>
                <button type="button" className="button-accent" onClick={() => setConfirming(false)}>Cancel</button>
              </>
            ) : (
              <button type="button" className="button-secondary" onClick={() => setConfirming(true)} aria-label="Delete application">
                <Trash2 size={16} />
              </button>
            )}
          </span>
        )}
      </div>
    </form>
  )
}
