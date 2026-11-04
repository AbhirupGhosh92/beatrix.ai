'use client'

import Link from 'next/link'
import { signOut } from 'firebase/auth'
import { Ellipsis, LogOut, Settings, User, type LucideIcon } from 'lucide-react'
import { getFirebaseAuth } from '../../lib/firebase.ts'
import { isExternalHref, visibleMenuItems } from '../../lib/drawer.ts'
import type { Role } from '../../lib/access.ts'
import { useSignOutMutation } from '../../store/api.ts'
import type { DropdownIcon } from '../../data/profile.ts'
import { useProfile } from './ProfileProvider.tsx'

const ICONS: Record<DropdownIcon, LucideIcon> = {
  user: User,
  settings: Settings,
  'log-out': LogOut,
}

const ITEM_CLASS = 'hover-subtle w-full text-left flex items-center gap-2'

export default function NavbarDropdown({ role }: { role: Role | null }) {
  const profile = useProfile()
  const [signOutServer] = useSignOutMutation()
  const { nav } = profile
  const items = visibleMenuItems(nav.dropdownItems, role)

  // Nothing to offer: no button at all, like the drawer's menu button.
  if (items.length === 0) return null

  async function handleSignOut() {
    // End the server session first (clears the cookie, and the store drops the role and the
    // cached data when it succeeds). If that fails the error snackbar says so; still sign out of
    // the Firebase client session, but keep showing the user as logged in since the cookie lives.
    await signOutServer()
    try {
      const auth = getFirebaseAuth()
      if (auth) await signOut(auth)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

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
        {items.map(({ id, label, icon, action, href }) => {
          const Icon = ICONS[icon]
          const content = (
            <>
              <Icon size={16} aria-hidden="true" />
              {label}
            </>
          )
          return (
            <li key={id}>
              {action === 'sign-out' ? (
                <button type="button" onClick={handleSignOut} className={ITEM_CLASS}>
                  {content}
                </button>
              ) : isExternalHref(href) ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={ITEM_CLASS}>
                  {content}
                </a>
              ) : (
                <Link href={href} className={ITEM_CLASS}>
                  {content}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
