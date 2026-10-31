'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { applicationApi } from '../../lib/applicationClient.ts'
import type { ApplicationList, ApplicationSummary } from '../../lib/applicationTypes.ts'
import { DEFAULT_VIEW, allLabels, viewApplications, type ViewState } from '../../lib/applicationView.ts'
import ApplicationForm from './ApplicationForm.tsx'
import ApplicationTable from './ApplicationTable.tsx'

// The tracker page: the user's applications with search, sort and filters, and the form for the
// one that is open ('new' for a blank one). Everything is filtered in the browser.
export default function JobTracker() {
  const [data, setData] = useState<ApplicationList | null>(null)
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW)
  const [open, setOpen] = useState<string | 'new' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    applicationApi
      .list()
      .then((list) => {
        if (ignore) return
        setData(list)
        setApplications(list.applications)
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Could not load the job tracker.')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  const labels = useMemo(() => allLabels(applications), [applications])
  const rows = useMemo(() => viewApplications(applications, view, data?.statuses ?? []), [applications, view, data])

  if (loading) {
    return <p className="flex items-center gap-2 text-muted"><Loader2 className="animate-spin" size={18} /> Loading...</p>
  }
  if (!data) {
    return <p role="alert" className="text-error">{error ?? 'The job tracker is unavailable.'}</p>
  }

  if (open) {
    const current = open === 'new' ? null : (applications.find((a) => a.id === open) ?? null)
    return (
      <ApplicationForm
        key={open}
        application={current}
        statuses={data.statuses}
        limits={data.limits}
        suggestions={labels}
        onSaved={(saved) =>
          setApplications((list) => (list.some((a) => a.id === saved.id) ? list.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...list]))
        }
        onDeleted={(id) => {
          setApplications((list) => list.filter((a) => a.id !== id))
          setOpen(null)
        }}
        onClose={() => setOpen(null)}
      />
    )
  }

  return (
    <ApplicationTable
      total={applications.length}
      rows={rows}
      statuses={data.statuses}
      labels={labels}
      view={view}
      onView={setView}
      onOpen={setOpen}
      onAdd={() => setOpen('new')}
    />
  )
}
