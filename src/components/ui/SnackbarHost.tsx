'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { dismiss } from '../../store/notifications.ts'
import type { Snackbar } from '../../store/notifications.ts'
import { useAppDispatch, useAppSelector } from '../../store/hooks.ts'

const DISMISS_MS = { success: 4000, info: 4000, error: 7000 } as const

/** Matches --ease-standard in tokens/motion.css. */
const EASE = [0.2, 0, 0, 1] as const

const ALERT_CLASS = { success: 'alert-success', error: 'alert-error', info: 'alert-info' } as const

function Item({ item, reduce }: { item: Snackbar; reduce: boolean }) {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismiss(item.id)), DISMISS_MS[item.kind])
    return () => clearTimeout(timer)
  }, [dispatch, item.id, item.kind])

  const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'error' ? AlertCircle : Info
  // Enter and exit fade and move vertically; `layout` slides the snackbars below into the freed space.
  // Under reduced motion nothing animates.
  const motionProps = reduce
    ? { initial: false as const, exit: { opacity: 0, transition: { duration: 0 } } }
    : {
        layout: true,
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: EASE } },
        transition: { duration: 0.25, ease: EASE },
      }
  return (
    <motion.div {...motionProps}>
    {/* Errors interrupt the screen reader (assertive); the rest wait their turn. */}
    <div role={item.kind === 'error' ? 'alert' : 'status'} className={`alert ${ALERT_CLASS[item.kind]} snackbar`}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{item.message}</span>
      <button type="button" className="snackbar-close" aria-label="Dismiss" onClick={() => dispatch(dismiss(item.id))}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
    </motion.div>
  )
}

/** Shows the notification queue; rendered once in the root layout. */
export default function SnackbarHost() {
  const items = useAppSelector((state) => state.notifications)
  const reduce = Boolean(useReducedMotion())
  return (
    <div className="toast toast-top toast-center snackbar-host" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <Item key={item.id} item={item} reduce={reduce} />
        ))}
      </AnimatePresence>
    </div>
  )
}
