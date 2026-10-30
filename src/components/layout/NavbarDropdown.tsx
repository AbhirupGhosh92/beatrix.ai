'use client'

import { signOut } from 'firebase/auth'
import { Ellipsis, LogOut, Settings, User, type LucideIcon } from 'lucide-react'
import { getFirebaseAuth } from '../../lib/firebase.ts'
import type { Profile } from '../../data/profile.ts'
import { useProfile } from './ProfileProvider.tsx'

const ICONS: Record<Profile['nav']['dropdownItems'][number]['icon'], LucideIcon> = {
  user: User,
  settings: Settings,
  'log-out': LogOut,
}

export default function NavbarDropdown({ onLogout }: { onLogout: () => void }) {
  const profile = useProfile()
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
        className="dropdown-content menu surface z-10 mt-2 w-52 p-2 shadow-lg"
      >
        {nav.dropdownItems.map(({ label, icon }) => {
          const Icon = ICONS[icon]
          const isLogout = icon === 'log-out'

          const handleClick = async () => {
            if (isLogout) {
              // End the server session first (clears the cookie). If that fails, still sign out of the
              // Firebase client session, but keep showing the user as logged in since the cookie lives.
              let serverSessionEnded = false
              try {
                const res = await fetch('/api/auth/session', { method: 'DELETE' })
                serverSessionEnded = res.ok
              } catch (error) {
                console.error('Server session delete failed:', error)
              }
              try {
                const auth = getFirebaseAuth()
                if (auth) await signOut(auth)
              } catch (error) {
                console.error('Sign out error:', error)
              }
              if (serverSessionEnded) onLogout()
            }
          }

          return (
            <li key={label}>
              <button
                type="button"
                onClick={handleClick}
                className="hover-subtle w-full text-left flex items-center gap-2"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
