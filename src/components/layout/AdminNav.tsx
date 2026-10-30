'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, FileCode, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle.tsx'

const SECTIONS = [
  { href: '/admin/cms', label: 'CMS', icon: FileCode },
  { href: '/admin/access', label: 'Access', icon: ShieldCheck },
] as const

// Top navbar of the admin area: back to the site, the admin sections (current one highlighted)
// and the theme toggle.
export default function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 edge-b bg-base-100/90 backdrop-blur">
      <nav
        aria-label="Admin sections"
        className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-3 sm:px-8"
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="button-accent btn-square flex items-center justify-center p-2 rounded-lg"
            aria-label="Back to Main Site"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="heading-display hidden truncate text-xl font-bold text-brand sm:block sm:text-2xl">
            Admin
          </h1>
          <ul className="flex items-center gap-1">
            {SECTIONS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`hover-subtle flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                      active ? 'bg-base-300 text-brand' : 'text-base-content/80'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <ThemeToggle />
      </nav>
    </header>
  )
}
