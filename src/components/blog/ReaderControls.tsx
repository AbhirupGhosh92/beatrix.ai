'use client'

import { MoveHorizontal } from 'lucide-react'
import { READER_THEMES, setReaderTheme, setReaderWidth, useReaderPrefs } from '../../lib/readerPrefs.ts'
import type { ReaderTheme } from '../../lib/readerPrefs.ts'

const THEME_LABELS: Record<ReaderTheme, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
  paper: 'Paper',
}

// Reading options for one post page: reader theme and compact/wide width. Remembered per browser.
export default function ReaderControls() {
  const { theme, width } = useReaderPrefs()
  const wide = width === 'wide'
  return (
    <div className="reader-controls flex flex-wrap items-center gap-2">
      <label className="text-meta flex items-center gap-2">
        <span>Reader theme</span>
        <select
          className="select select-sm"
          value={theme}
          onChange={(e) => {
            const next = READER_THEMES.find((t) => t === e.target.value)
            if (next) setReaderTheme(next)
          }}
        >
          {READER_THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="button-secondary flex items-center gap-2"
        aria-pressed={wide}
        onClick={() => setReaderWidth(wide ? 'compact' : 'wide')}
      >
        <MoveHorizontal size={16} aria-hidden="true" /> {wide ? 'Wide' : 'Compact'}
      </button>
    </div>
  )
}
