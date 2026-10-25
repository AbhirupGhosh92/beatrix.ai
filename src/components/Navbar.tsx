import { Menu} from 'lucide-react'
import NavbarDropdown from './NavbarDropdown'
import { ThemeToggle } from '../ThemeToggle';
import { profile } from '../data/profile.ts'

export default function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
    return (
        <nav className="navbar px-0">
            <div className="navbar-start min-w-0 flex-1 gap-2 sm:gap-4">
                {isLoggedIn && <div>
                    <label htmlFor="nav-drawer" className="button-accent btn-square normal-case text-xl">
                        <Menu size={20} aria-hidden="true" />
                    </label>
                </div>}
                <div className="min-w-0 sm:pl-6">
                    <div className="glitch-hover truncate font-display text-lg tracking-wide uppercase sm:text-2xl">{profile.site.brand}</div>
                </div>
            </div>
            <div className="navbar-end w-auto flex-none gap-2 sm:gap-3">
                 <ThemeToggle/>    
               {isLoggedIn && <NavbarDropdown />}
            </div>
        </nav>
    )
}