'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Pencil, Plus, Search } from 'lucide-react'
import type { TrackerStatus } from '../../data/resumeConfig.ts'
import type { ApplicationSummary } from '../../lib/applicationTypes.ts'
import { nextSort, type SortKey, type ViewState } from '../../lib/applicationView.ts'

interface Props {
  /** Everything loaded, used for the totals. */
  total: number
  /** Applications the user may hold, or null for no cap. */
  cap: number | null
  /** After search, filters and sort. */
  rows: ApplicationSummary[]
  statuses: TrackerStatus[]
  labels: string[]
  view: ViewState
  onView: (view: ViewState) => void
  onOpen: (id: string) => void
  onAdd: () => void
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'appliedAt', label: 'Applied' },
]

export default function ApplicationTable({ total, cap, rows, statuses, labels, view, onView, onOpen, onAdd }: Props) {
  const statusLabel = (id: string) => statuses.find((s) => s.id === id)?.label ?? id
  const filtered = view.search !== '' || view.status !== '' || view.labels.length > 0
  const atCap = cap !== null && total >= cap

  function sortHeader({ key, label }: { key: SortKey; label: string }) {
    const active = view.sort.key === key
    const Icon = !active ? ArrowUpDown : view.sort.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th key={key} aria-sort={active ? (view.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="btn-ghost btn-sm gap-1 px-1" onClick={() => onView({ ...view, sort: nextSort(view.sort, key) })}>
          {label} <Icon size={14} aria-hidden />
        </button>
      </th>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface rounded-box flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-meta-strong font-semibold">Search</span>
            <span className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                className="input input-bordered w-full pl-9"
                placeholder="Company, role, notes or label"
                value={view.search}
                onChange={(event) => onView({ ...view, search: event.target.value })}
              />
            </span>
          </label>
          <label className="flex flex-col gap-1 sm:w-48">
            <span className="text-meta-strong font-semibold">Status</span>
            <select className="select select-bordered w-full" value={view.status} onChange={(event) => onView({ ...view, status: event.target.value })}>
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <button type="button" className="button-primary" onClick={onAdd} disabled={atCap}>
            <Plus size={16} /> Add application
          </button>
        </div>

        {labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by labels">
            <span className="text-meta">Labels:</span>
            {labels.map((label) => {
              const on = view.labels.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  className={on ? 'button-primary btn-xs' : 'button-accent btn-xs'}
                  onClick={() => onView({ ...view, labels: on ? view.labels.filter((l) => l !== label) : [...view.labels, label] })}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <p className="text-meta flex flex-wrap items-center gap-3" aria-live="polite">
          <span>
            {cap !== null ? `${total} of ${cap} applications used` : filtered ? `${rows.length} of ${total} applications match` : `${total} applications`}
            {atCap && ' - delete one to add another'}
          </span>
          {filtered && cap !== null && <span>{rows.length} match</span>}
          {filtered && (
            <button type="button" className="btn-ghost btn-xs" onClick={() => onView({ ...view, search: '', status: '', labels: [] })}>
              Clear filters
            </button>
          )}
        </p>
      </div>

      {total === 0 ? (
        <p className="text-muted">No applications yet. Add the first one above.</p>
      ) : rows.length === 0 ? (
        <p className="text-muted">Nothing matches these filters.</p>
      ) : (
        <div className="surface rounded-box overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {COLUMNS.map(sortHeader)}
                <th>Labels</th>
                <th>Notes</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.company}</td>
                  <td>{a.role}</td>
                  <td><span className="badge badge-outline whitespace-nowrap">{statusLabel(a.status)}</span></td>
                  <td className="whitespace-nowrap">{a.appliedAt}</td>
                  <td>
                    <ul className="flex flex-wrap gap-1" aria-label={`Labels of ${a.company}`}>
                      {a.labels.map((label) => <li key={label} className="badge badge-outline badge-sm">{label}</li>)}
                    </ul>
                  </td>
                  <td className="max-w-56 truncate text-meta" title={a.notes}>{a.notes}</td>
                  <td>
                    <span className="flex items-center justify-end gap-2">
                      {a.jobUrl && (
                        <a className="text-brand" href={a.jobUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open the job posting for ${a.company} (new tab)`}>
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button type="button" className="button-accent btn-square" onClick={() => onOpen(a.id)} aria-label={`Edit ${a.company}`}>
                        <Pencil size={14} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
