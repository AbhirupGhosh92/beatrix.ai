'use client'

import { Menu} from 'lucide-react'
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
}

export default function Navbar({ isLoggedIn, role, showMenu }: Props) {
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
                 <ThemeToggle/>    
               {isLoggedIn && <NavbarDropdown role={role} />}
            </div>
        </nav>
    )
}