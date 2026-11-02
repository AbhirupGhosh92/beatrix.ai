'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { dismiss } from '../../store/notifications.ts'
import type { Snackbar } from '../../store/notifications.ts'
import { useAppDispatch, useAppSelector } from '../../store/hooks.ts'

const DISMISS_MS = { success: 4000, info: 4000, error: 7000 } as const

const ALERT_CLASS = { success: 'alert-success', error: 'alert-error', info: 'alert-info' } as const

function Item({ item }: { item: Snackbar }) {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismiss(item.id)), DISMISS_MS[item.kind])
    return () => clearTimeout(timer)
  }, [dispatch, item.id, item.kind])

  const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'error' ? AlertCircle : Info
  return (
    // Errors interrupt the screen reader (assertive); the rest wait their turn.
    <div role={item.kind === 'error' ? 'alert' : 'status'} className={`alert ${ALERT_CLASS[item.kind]} snackbar`}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{item.message}</span>
      <button type="button" className="snackbar-close" aria-label="Dismiss" onClick={() => dispatch(dismiss(item.id))}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Shows the notification queue; rendered once in the root layout. */
export default function SnackbarHost() {
  const items = useAppSelector((state) => state.notifications)
  return (
    <div className="toast toast-top toast-center snackbar-host" aria-live="polite">
      {items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  )
}
