'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle.tsx'

// Top bar of the resume builder and the job tracker: back to the site and the theme toggle.
export default function ResumeNav({ title = 'Resume builder' }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 edge-b bg-base-100/90 backdrop-blur">
      <nav aria-label={title} className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/" className="button-accent btn-square flex items-center justify-center p-2 rounded-lg" aria-label="Back to Main Site">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="heading-display truncate text-xl font-bold text-brand sm:text-2xl">{title}</h1>
        </div>
        <ThemeToggle />
      </nav>
    </header>
  )
}
