'use client'

import Link from 'next/link'
import { Sliders } from 'lucide-react'
import { can, type Role } from '../../lib/access.ts'
import { useProfile } from './ProfileProvider.tsx'

export default function DrawerMenu({ role }: { role: Role }) {
  const profile = useProfile()
  const { nav } = profile

  return (
    <div className="drawer-side z-40">
      <label htmlFor="nav-drawer" aria-label={nav.closeSidebarLabel} className="drawer-overlay" />
      <ul className="menu bg-base-200 text-base-content min-h-full w-72 max-w-[85vw] p-4 sm:w-80">
        <div className="px-3 py-2 font-display text-sm uppercase tracking-wider text-brand font-bold edge-b mb-2">
          {nav.drawerTitle}
        </div>
        {nav.drawerItems.map((item) => (
          <li key={item}>
            <a className="hover-subtle">{item}</a>
          </li>
        ))}

        {/* Admin CMS section: only for roles holding cms:write (the server enforces it too). */}
        {can(role, 'cms:write') && (
          <div className="pt-4 border-t border-base-300 mt-4">
            <div className="px-3 pb-2 text-xs uppercase tracking-wider text-muted font-semibold">
              {nav.adminTitle}
            </div>
            <li>
              <Link
                href={nav.adminHref}
                className="hover-neon text-brand-2 flex items-center gap-2 font-bold py-2.5"
              >
                <Sliders size={18} />
                <span>{nav.adminLabel}</span>
              </Link>
            </li>
          </div>
        )}
      </ul>
    </div>
  )
}
