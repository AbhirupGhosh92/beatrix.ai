'use client'

import { useEffect, useMemo } from 'react'
import { allLabels, viewApplications } from '../../lib/applicationView.ts'
import { useListApplicationsQuery } from '../../store/api.ts'
import { useAppDispatch, useAppSelector } from '../../store/hooks.ts'
import { openApplication, resetTracker, setView } from '../../store/tracker.ts'
import { ErrorState, SkeletonPage } from '../ui/Skeleton.tsx'
import ApplicationForm from './ApplicationForm.tsx'
import ApplicationTable from './ApplicationTable.tsx'

// The tracker page: the user's applications with search, sort and filters, and the form for the
// one that is open ('new' for a blank one). The list comes from the store's data layer and is
// filtered in the browser; the view and the open application live in the tracker slice.
export default function JobTracker() {
  const dispatch = useAppDispatch()
  const view = useAppSelector((state) => state.tracker.view)
  const open = useAppSelector((state) => state.tracker.open)
  const { data, isLoading, isError, error, refetch } = useListApplicationsQuery()

  // Leaving the page returns the tracker to the list with the default view.
  useEffect(() => () => void dispatch(resetTracker()), [dispatch])

  const applications = useMemo(() => data?.applications ?? [], [data])
  const labels = useMemo(() => allLabels(applications), [applications])
  const rows = useMemo(() => viewApplications(applications, view, data?.statuses ?? []), [applications, view, data])

  if (isLoading) return <SkeletonPage label="Loading your applications" />
  if (!data) {
    const message = (isError && error && 'message' in error ? error.message : undefined) ?? 'The job tracker is unavailable.'
    return <ErrorState message={message} onRetry={() => void refetch()} />
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
        onDeleted={() => dispatch(openApplication(null))}
        onClose={() => dispatch(openApplication(null))}
      />
    )
  }

  return (
    <ApplicationTable
      total={applications.length}
      cap={data.cap}
      rows={rows}
      statuses={data.statuses}
      labels={labels}
      view={view}
      onView={(next) => dispatch(setView(next))}
      onOpen={(id) => dispatch(openApplication(id))}
      onAdd={() => dispatch(openApplication('new'))}
    />
  )
}
