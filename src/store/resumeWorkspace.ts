// The resume builder's shared state: which resume is open, the one working copy (`doc`) every panel
// reads, the snapshot last stored and the save status. The resume list itself is server data and lives
// in the API cache. There is no undo/redo, by decision.
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { ResumeData, ResumeView, Structure } from '../lib/resumeValidation.ts'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

export interface Doc {
  title: string
  data: ResumeData
  /** The resume's own structure (advanced users), or null to use the default one. */
  structure: Structure | null
  /** Section order and exported variants; part of the resume, never of the structure. */
  view?: ResumeView
}

export const snapshotOf = (doc: Doc) => JSON.stringify(doc)

interface WorkspaceState {
  openId: string | null
  /** The id `doc` was loaded for; null until the open resume has loaded. */
  loadedId: string | null
  doc: Doc | null
  /** Snapshot of the stored version, to tell unsaved edits. */
  saved: string
  /** The Storage generation the next save quotes (a mismatch is a 409). */
  generation: string
  status: SaveStatus
  message: string | null
}

const initialState: WorkspaceState = {
  openId: null,
  loadedId: null,
  doc: null,
  saved: '',
  generation: '',
  status: 'idle',
  message: null,
}

const slice = createSlice({
  name: 'resumeWorkspace',
  initialState,
  reducers: {
    /** Open a resume (or pass null for the list); drops the previous working copy. */
    openResume: (_state, action: PayloadAction<string | null>) => ({ ...initialState, openId: action.payload }),
    loaded: (state, action: PayloadAction<{ id: string; doc: Doc; generation: string }>) => {
      state.loadedId = action.payload.id
      state.doc = action.payload.doc
      state.saved = snapshotOf(action.payload.doc)
      state.generation = action.payload.generation
      state.status = 'idle'
      state.message = null
    },
    edited: (state, action: PayloadAction<Doc>) => {
      state.doc = action.payload
    },
    saveStarted: (state) => {
      state.status = 'saving'
      state.message = null
    },
    saveSucceeded: (state, action: PayloadAction<{ snapshot: string; generation: string }>) => {
      state.saved = action.payload.snapshot
      state.generation = action.payload.generation
      state.status = 'saved'
    },
    saveFailed: (state, action: PayloadAction<{ conflict: boolean; message: string }>) => {
      state.status = action.payload.conflict ? 'conflict' : 'error'
      state.message = action.payload.message
    },
  },
})

export const { openResume, loaded, edited, saveStarted, saveSucceeded, saveFailed } = slice.actions
export const resumeWorkspaceReducer = slice.reducer
