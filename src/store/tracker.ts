// The job tracker's page state: the list view (search, sort, filters) and which application is open.
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_VIEW } from '../lib/applicationView.ts'
import type { ViewState } from '../lib/applicationView.ts'

interface TrackerState {
  view: ViewState
  /** An application id, 'new' for a blank form, or null for the list. */
  open: string | 'new' | null
}

const initialState: TrackerState = { view: DEFAULT_VIEW, open: null }

const slice = createSlice({
  name: 'tracker',
  initialState,
  reducers: {
    setView: (state, action: PayloadAction<ViewState>) => {
      state.view = action.payload
    },
    /** Leaving the page returns it to the list with the default view. */
    resetTracker: () => initialState,
    openApplication: (state, action: PayloadAction<string | 'new' | null>) => {
      state.open = action.payload
    },
  },
})

export const { setView, openApplication, resetTracker } = slice.actions
export const trackerReducer = slice.reducer
