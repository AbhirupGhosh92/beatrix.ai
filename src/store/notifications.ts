// Snackbars: a queue in the store, filled by a listener that turns every API outcome into a message
// (api-feedback spec). Components never dispatch success or error toasts for API calls themselves.
import { createListenerMiddleware, createSlice, isFulfilled, isRejected, nanoid } from '@reduxjs/toolkit'
import type { PayloadAction, UnknownAction } from '@reduxjs/toolkit'
import type { ApiError } from './api.ts'

export type SnackbarKind = 'success' | 'error' | 'info'

export interface Snackbar {
  id: string
  kind: SnackbarKind
  message: string
}

const MAX_VISIBLE = 4

const slice = createSlice({
  name: 'notifications',
  initialState: [] as Snackbar[],
  reducers: {
    notify: {
      reducer: (state, action: PayloadAction<Snackbar>) => {
        state.push(action.payload)
        if (state.length > MAX_VISIBLE) state.shift()
      },
      prepare: (kind: SnackbarKind, message: string) => ({ payload: { id: nanoid(), kind, message } }),
    },
    dismiss: (state, action: PayloadAction<string>) => state.filter((item) => item.id !== action.payload),
  },
})

export const { notify, dismiss } = slice.actions
export const notificationsReducer = slice.reducer

interface EndpointMeta {
  arg?: { type?: string; endpointName?: string; originalArgs?: unknown }
  condition?: boolean
  aborted?: boolean
}

type Arg = Record<string, unknown> | string | undefined
type Result = Record<string, unknown> | undefined

/** Success messages for every mutation; return null to stay silent (autosave). */
const SUCCESS: Record<string, (arg: Arg, result: Result) => string | null> = {
  signIn: () => 'Signed in.',
  signOut: () => 'Signed out.',
  createResume: () => 'Resume created.',
  saveResume: (arg) => (typeof arg === 'object' && arg?.silent ? null : 'Resume saved.'),
  deleteResume: () => 'Resume deleted.',
  createApplication: () => 'Application added.',
  updateApplication: () => 'Application updated.',
  deleteApplication: () => 'Application deleted.',
  createTailoredResume: () => 'Tailored resume created.',
  tailorResume: () => 'Tailored suggestion ready.',
  skillMatch: () => 'Skill match ready.',
  adminSetUser: (arg) => (typeof arg === 'object' ? `Updated ${String(arg.email)}` : 'User updated.'),
  adminPurgeOwner: (arg, result) =>
    typeof arg === 'object'
      ? `Deleted ${Number(result?.deletedObjects ?? 0)} stored files and ${Number(result?.deletedApplications ?? 0)} applications for ${String(arg.email)}`
      : 'Data deleted.',
  cmsSave: (arg, result) =>
    typeof result?.message === 'string' ? result.message : `Saved ${typeof arg === 'object' ? String(arg.file) : 'file'} successfully!`,
}

/** Queries whose failure is part of normal operation: no snackbar. */
const QUIET_QUERIES = new Set(['getSessionRole'])

export const notificationListener = createListenerMiddleware()

notificationListener.startListening({
  predicate: (action) => (isFulfilled(action) || isRejected(action)) && action.type.startsWith('api/execute'),
  effect: (action: UnknownAction, listenerApi) => {
    const meta = (action as { meta?: EndpointMeta }).meta
    const arg = meta?.arg
    if (!arg?.endpointName || meta?.condition || meta?.aborted) return
    if (isRejected(action)) {
      if (arg.type === 'query' && QUIET_QUERIES.has(arg.endpointName)) return
      // An API failure carries its message in the payload; an internal or serialization error has it in `error`.
      const error = (action as { payload?: ApiError }).payload
      const internal = (action as { error?: { message?: string } }).error
      listenerApi.dispatch(notify('error', error?.message || internal?.message || 'Something went wrong. Please try again.'))
    } else if (arg.type === 'mutation') {
      const message = SUCCESS[arg.endpointName]?.(arg.originalArgs as Arg, (action as { payload?: Result }).payload)
      if (message) listenerApi.dispatch(notify('success', message))
    }
  },
})
