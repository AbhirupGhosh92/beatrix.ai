'use client'

import Link from 'next/link'
import { ArrowLeft, Briefcase, FileText } from 'lucide-react'
import { isFeatureEnabled } from '../../lib/access.ts'
import { useProfile } from './ProfileProvider.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

/** The other feature this top bar links to; `itemId` is its menu item, which must be enabled. */
export interface SwitchTo {
  itemId: 'resume-builder' | 'job-tracker'
  label: string
  href: string
}

const ICONS = { 'resume-builder': FileText, 'job-tracker': Briefcase }

// Top bar of the resume builder and the job tracker: back to the site, a quick link to the other
// feature (only while its menu item is enabled) and the theme toggle.
export default function ResumeNav({ title = 'Resume builder', switchTo }: { title?: string; switchTo?: SwitchTo }) {
  const { nav } = useProfile()
  const Icon = switchTo ? ICONS[switchTo.itemId] : null
  const showSwitch = switchTo !== undefined && isFeatureEnabled(nav.drawerItems, switchTo.itemId)

  return (
    <header className="sticky top-0 z-30 edge-b bg-base-100/90 backdrop-blur">
      <nav aria-label={title} className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/" className="button-accent btn-square flex items-center justify-center p-2 rounded-lg" aria-label="Back to Main Site">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="heading-display truncate text-xl font-bold text-brand sm:text-2xl">{title}</h1>
        </div>
        <div className="flex flex-none items-center gap-2 sm:gap-3">
          {showSwitch && Icon && (
            <Link href={switchTo.href} className="button-secondary flex items-center gap-2" aria-label={switchTo.label}>
              <Icon size={18} aria-hidden />
              <span className="hidden sm:inline">{switchTo.label}</span>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
