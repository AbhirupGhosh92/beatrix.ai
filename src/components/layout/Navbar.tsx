'use client'

import { Menu} from 'lucide-react'
import NavbarDropdown from './NavbarDropdown.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'
import { useProfile } from './ProfileProvider.tsx'

interface Props {
  isLoggedIn: boolean
  /** Whether the drawer lists anything; without entries there is no menu button. */
  showMenu: boolean
  onLogout: () => void
}

export default function Navbar({ isLoggedIn, showMenu, onLogout }: Props) {
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
                    <div className="glitch-hover truncate heading-display text-lg sm:text-2xl">{profile.site.brand}</div>
                </div>
            </div>
            <div className="navbar-end w-auto flex-none gap-2 sm:gap-3">
                 <ThemeToggle/>    
               {isLoggedIn && <NavbarDropdown onLogout={onLogout} />}
            </div>
        </nav>
    )
}