'use client'

import type { ReactNode } from 'react'
import { useReaderPrefs } from '../../lib/readerPrefs.ts'
import ReaderControls from './ReaderControls.tsx'

// Wraps a post for reading: shows the reader controls and sets the reader theme and width on this
// wrapper only. `auto` sets no theme attribute, so the site theme applies.
export default function ReaderFrame({ children }: { children: ReactNode }) {
  const { theme, width } = useReaderPrefs()
  return (
    <div className="reader" data-reader-theme={theme === 'auto' ? undefined : theme} data-reader-width={width}>
      <div className="reader-inner flex flex-col gap-6">
        <ReaderControls />
        {children}
      </div>
    </div>
  )
}
