import { useSyncExternalStore } from 'react'

// Reader view options for blog posts: purely local view state (like the site theme, not Redux).
// Stored in localStorage; when storage is unavailable the value stays in memory, so the controls
// still work for the visit and across posts in it.
export const READER_THEMES = ['auto', 'light', 'dark', 'paper'] as const
export const READER_WIDTHS = ['compact', 'wide'] as const
export type ReaderTheme = (typeof READER_THEMES)[number]
export type ReaderWidth = (typeof READER_WIDTHS)[number]

export interface ReaderPrefs {
  theme: ReaderTheme
  width: ReaderWidth
}

const THEME_KEY = 'blog-reader-theme'
const WIDTH_KEY = 'blog-reader-width'
export const DEFAULT_READER_PREFS: ReaderPrefs = { theme: 'auto', width: 'compact' }

const isTheme = (v: unknown): v is ReaderTheme => READER_THEMES.some((t) => t === v)
const isWidth = (v: unknown): v is ReaderWidth => READER_WIDTHS.some((w) => w === v)

let current: ReaderPrefs | null = null
const listeners = new Set<() => void>()

function read(): ReaderPrefs {
  let theme = DEFAULT_READER_PREFS.theme
  let width = DEFAULT_READER_PREFS.width
  try {
    const t = window.localStorage.getItem(THEME_KEY)
    const w = window.localStorage.getItem(WIDTH_KEY)
    if (isTheme(t)) theme = t
    if (isWidth(w)) width = w
  } catch {
    // storage unavailable: defaults
  }
  return { theme, width }
}

function snapshot(): ReaderPrefs {
  if (current === null) current = read()
  return current
}

function serverSnapshot(): ReaderPrefs {
  return DEFAULT_READER_PREFS
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function update(next: ReaderPrefs, key: string, value: string) {
  current = next
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // kept in memory only
  }
  listeners.forEach((l) => l())
}

export function setReaderTheme(theme: ReaderTheme) {
  if (!isTheme(theme)) return
  update({ ...snapshot(), theme }, THEME_KEY, theme)
}

export function setReaderWidth(width: ReaderWidth) {
  if (!isWidth(width)) return
  update({ ...snapshot(), width }, WIDTH_KEY, width)
}

export function useReaderPrefs(): ReaderPrefs {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
