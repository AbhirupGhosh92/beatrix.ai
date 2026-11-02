'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useAdminPurgeOwnerMutation, useListOwnersQuery } from '../../store/api.ts'
import { ErrorState, SkeletonRows } from '../ui/Skeleton.tsx'

const formatBytes = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

// Same pattern as the other admin screens: only this site's /api/admin routes are called, through the
// store's data layer with the Firebase ID token. The list holds no resume or application content, only
// who owns data and how much.
export default function OrphanedResumes() {
  const { data, isLoading, isFetching, isError, error, refetch } = useListOwnersQuery()
  const [purgeOwner] = useAdminPurgeOwnerMutation()
  const owners = useMemo(() => [...(data?.owners ?? [])].sort((a, b) => a.email.localeCompare(b.email)), [data])
  const truncated = data?.truncated ?? false
  const [confirming, setConfirming] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  async function purge(email: string) {
    setBusy(true)
    try {
      await purgeOwner({ email, confirmEmail: typed }).unwrap()
      setConfirming(null)
      setTyped('')
    } catch {
      // Already reported by the error snackbar.
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="surface rounded-xl p-4 shadow-sm" aria-labelledby="orphans-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="orphans-heading" className="heading-display text-lg font-bold text-brand">
            Resume and application data without access
          </h2>
          <p className="text-meta">
            Resumes and job applications kept for users who were revoked or removed. You can see who owns data and how much, never its content.
          </p>
        </div>
        <button type="button" className="button-secondary btn-sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <SkeletonRows rows={3} className="mt-4" />
      ) : isError && !data ? (
        <div className="mt-4">
          <ErrorState message={('message' in error! && error.message) || 'Could not load data owners.'} onRetry={() => void refetch()} />
        </div>
      ) : owners.length === 0 ? (
        <p className="mt-4 text-muted">No resume or application data is left behind by users without access.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Resumes</th>
                <th>Applications</th>
                <th>Size</th>
                <th>Last change</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.email}>
                  <td className="font-semibold">{owner.email}</td>
                  <td>{owner.count}</td>
                  <td>{owner.applications}</td>
                  <td>{formatBytes(owner.bytes)}</td>
                  <td>{owner.updatedAt ? new Date(owner.updatedAt).toLocaleString() : '-'}</td>
                  <td className="min-w-72">
                    {confirming === owner.email ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-error">
                          This permanently deletes every resume, older version and job application. It cannot be undone.
                        </p>
                        <input
                          className="input input-bordered input-sm w-full"
                          aria-label={`Type ${owner.email} to confirm`}
                          placeholder={`Type ${owner.email} to confirm`}
                          value={typed}
                          onChange={(event) => setTyped(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="button-secondary btn-sm"
                            disabled={busy || typed.trim().toLowerCase() !== owner.email}
                            onClick={() => void purge(owner.email)}
                          >
                            <Trash2 size={14} /> Delete permanently
                          </button>
                          <button
                            type="button"
                            className="button-accent btn-sm"
                            onClick={() => {
                              setConfirming(null)
                              setTyped('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="button-secondary btn-sm" onClick={() => setConfirming(owner.email)}>
                        <Trash2 size={14} /> Delete data
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {truncated && <p className="text-meta mt-2">Showing the first 500 owners only.</p>}
    </section>
  )
}
