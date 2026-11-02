// Shared UI state: the navigation drawer.
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

const slice = createSlice({
  name: 'ui',
  initialState: { drawerOpen: false },
  reducers: {
    setDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.drawerOpen = action.payload
    },
  },
})

export const { setDrawerOpen } = slice.actions
export const uiReducer = slice.reducer
