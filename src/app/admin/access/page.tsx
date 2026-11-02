'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { RefreshCw, UserPlus } from 'lucide-react'
import { ROLES } from '../../../lib/access.ts'
import type { Role } from '../../../lib/access.ts'
import { getFirebaseAuth } from '../../../lib/firebase.ts'
import { useAdminSetUserMutation, useListUsersQuery } from '../../../store/api.ts'
import type { AccessAction } from '../../../store/api.ts'
import OrphanedResumes from '../../../components/admin/OrphanedResumes.tsx'
import { ErrorState, SkeletonRows } from '../../../components/ui/Skeleton.tsx'

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-')

export default function AccessPage() {
  // Like the CMS page, the browser only talks to this site's own /api/admin routes through the store's
  // data layer; the Firebase ID token proves who is signed in and the Cloud Functions enforce the admin
  // role and the guards. Outcomes raise snackbars from the store.
  const { data, isLoading, isFetching, isError, error, refetch } = useListUsersQuery()
  const [setUser] = useAdminSetUserMutation()
  const users = useMemo(() => [...(data?.users ?? [])].sort((a, b) => a.email.localeCompare(b.email)), [data])
  const truncated = data?.truncated ?? false
  const [busy, setBusy] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [me, setMe] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const auth = getFirebaseAuth()
    auth?.authStateReady().then(() => {
      if (!ignore) setMe(auth.currentUser?.email?.toLowerCase() ?? null)
    })
    return () => {
      ignore = true
    }
  }, [])

  const run = async (email: string, action: AccessAction, role?: Role) => {
    setBusy(email)
    try {
      await setUser({ email, action, role }).unwrap()
    } catch {
      // Already reported by the error snackbar.
    } finally {
      setBusy(null)
    }
  }

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    await run(email, 'add')
    setNewEmail('')
  }

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-col gap-4 surface p-4 rounded-xl shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-display text-lg font-bold text-brand">Access</h2>
          <p className="text-meta">New sign-ins join as readers. Admins can manage the CMS and this page.</p>
        </div>
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="name@example.com"
            aria-label="Email to add"
            className="input input-bordered input-sm w-64 max-w-full focus:outline-none"
          />
          <button type="submit" disabled={busy !== null} className="button-primary btn-sm flex items-center gap-1 text-xs">
            <UserPlus size={14} />
            Add user
          </button>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="btn btn-ghost btn-xs btn-square"
            title="Refresh users"
            aria-label="Refresh users"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-brand' : ''} />
          </button>
        </form>
      </div>

      {isError && !data && (
        <ErrorState message={('message' in error! && error.message) || 'Could not load users.'} onRetry={() => void refetch()} />
      )}
      <div className="surface overflow-x-auto rounded-xl shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last sign-in</th>
              <th className="text-right">Access</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5}>
                  <SkeletonRows rows={4} />
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const isMe = user.email === me
              const disabled = busy === user.email
              return (
                <tr key={user.email}>
                  <td>
                    <div className="font-semibold break-all">{user.email}</div>
                    <div className="text-meta">
                      {user.displayName || '-'}
                      {isMe && ' (you)'}
                    </div>
                  </td>
                  <td>
                    <select
                      className="select select-bordered select-xs focus:outline-none"
                      value={user.role}
                      disabled={disabled || isMe}
                      aria-label={`Role for ${user.email}`}
                      onChange={(e) => run(user.email, 'setRole', e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${user.allowed ? 'badge-success' : 'badge-error'}`}>
                      {user.allowed ? 'active' : 'revoked'}
                    </span>
                  </td>
                  <td className="text-meta">{formatDate(user.lastLoginAt)}</td>
                  <td className="text-right">
                    {user.allowed ? (
                      <button
                        onClick={() => run(user.email, 'revoke')}
                        disabled={disabled || isMe}
                        className="button-accent btn-xs text-xs"
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        onClick={() => run(user.email, 'restore')}
                        disabled={disabled}
                        className="button-secondary btn-xs text-xs"
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {truncated && <p className="text-meta">Showing the first 500 users only.</p>}

      <OrphanedResumes />
    </main>
  )
}
