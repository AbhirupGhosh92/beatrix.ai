import { Ellipsis, LogOut, Settings, User, type LucideIcon } from 'lucide-react'
import { profile } from '../data/profile.ts'

const ICONS: Record<(typeof profile.nav.dropdownItems)[number]['icon'], LucideIcon> = {
  user: User,
  settings: Settings,
  'log-out': LogOut,
}

export default function NavbarDropdown() {
  const { nav } = profile

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="button-secondary btn-square"
        aria-label={nav.moreLabel}
        aria-haspopup="menu"
      >
        <Ellipsis size={20} aria-hidden="true" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-200 border border-base-300 z-10 mt-2 w-52 p-2 shadow-lg"
      >
        {nav.dropdownItems.map(({ label, icon }) => {
          const Icon = ICONS[icon]
          return (
            <li key={label}>
              <a className="hover-subtle">
                <Icon size={16} aria-hidden="true" />
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
