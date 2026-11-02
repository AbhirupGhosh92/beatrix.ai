import { configureStore } from '@reduxjs/toolkit'
import { api } from './api.ts'
import { notificationListener, notificationsReducer } from './notifications.ts'
import { resumeWorkspaceReducer } from './resumeWorkspace.ts'
import { trackerReducer } from './tracker.ts'
import { uiReducer } from './ui.ts'

/** A new store per provider (never a module singleton), so server rendering cannot share state between users. */
export function makeStore() {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      notifications: notificationsReducer,
      ui: uiReducer,
      tracker: trackerReducer,
      resumeWorkspace: resumeWorkspaceReducer,
    },
    middleware: (getDefault) => getDefault().prepend(notificationListener.middleware).concat(api.middleware),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
