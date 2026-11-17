'use client'

import Link from 'next/link'
import { House, Menu } from 'lucide-react'
import type { Role } from '../../lib/access.ts'
import NavbarDropdown from './NavbarDropdown.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'
import { useProfile } from './ProfileProvider.tsx'

interface Props {
  isLoggedIn: boolean
  /** The signed-in role, used to decide which account menu entries to list. */
  role: Role | null
  /** Whether the drawer lists anything; without entries there is no menu button. */
  showMenu: boolean
  /** When set, a link to the main site (the landing page) is shown before the theme toggle. */
  mainSiteHref?: string
}

export default function Navbar({ isLoggedIn, role, showMenu, mainSiteHref }: Props) {
  const profile = useProfile()
    return (
        <nav className="navbar px-0">
            <div className="navbar-start min-w-0 flex-1 gap-2 sm:gap-4">
                {showMenu && <div>
                    <label htmlFor="nav-drawer" className="button-accent btn-square normal-case text-xl">
                        <Menu size={20} aria-hidden="true" />
                    </label>
                </div>}
                <div className="min-w-0 sm:pl-6">
                    <div className="truncate heading-display text-lg sm:text-2xl">{profile.site.brand}</div>
                </div>
            </div>
            <div className="navbar-end w-auto flex-none gap-2 sm:gap-3">
                {mainSiteHref && (
                    <Link href={mainSiteHref} className="button-accent flex items-center gap-2 text-sm">
                        <House size={16} aria-hidden="true" />
                        <span className="hidden sm:inline">{profile.nav.mainSiteLabel}</span>
                        <span className="sm:hidden sr-only">{profile.nav.mainSiteLabel}</span>
                    </Link>
                )}
                 <ThemeToggle/>    
               {isLoggedIn && <NavbarDropdown role={role} />}
            </div>
        </nav>
    )
}