'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { getIdToken } from '../../lib/firebase.ts'

interface Owner {
  email: string
  /** Resumes. */
  count: number
  applications: number
  bytes: number
  updatedAt: string | null
}

interface Props {
  notify: (type: 'success' | 'error', msg: string) => void
}

// Same pattern as the other admin screens: only this site's /api/admin routes are called, with the
// Firebase ID token. The list holds no resume or application content, only who owns data and how much.
async function api<T>(init: { method?: string; body?: object } = {}): Promise<T> {
  const token = await getIdToken()
  const res = await fetch('/api/admin/resumes', {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as T
}

const formatBytes = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

export default function OrphanedResumes({ notify }: Props) {
  const [owners, setOwners] = useState<Owner[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ owners: Owner[]; truncated: boolean }>()
      setOwners([...data.owners].sort((a, b) => a.email.localeCompare(b.email)))
      setTruncated(data.truncated)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not load data owners')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    let ignore = false
    api<{ owners: Owner[]; truncated: boolean }>()
      .then((data) => {
        if (ignore) return
        setOwners([...data.owners].sort((a, b) => a.email.localeCompare(b.email)))
        setTruncated(data.truncated)
      })
      .catch((err: unknown) => {
        if (!ignore) notify('error', err instanceof Error ? err.message : 'Could not load data owners')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [notify])

  async function purge(email: string) {
    setBusy(true)
    try {
      const result = await api<{ deletedObjects: number; deletedApplications: number }>({ method: 'POST', body: { email, confirmEmail: typed } })
      notify('success', `Deleted ${result.deletedObjects} stored files and ${result.deletedApplications} applications for ${email}`)
      setConfirming(null)
      setTyped('')
      await load()
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Delete failed')
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
        <button type="button" className="button-secondary btn-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && owners.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-muted">
          <Loader2 className="animate-spin" size={16} /> Loading...
        </p>
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
                            {busy ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Delete permanently
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
