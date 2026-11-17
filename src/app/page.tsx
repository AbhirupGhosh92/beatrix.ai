'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useGetSessionRoleQuery } from '../store/api.ts'
import { useAppDispatch, useAppSelector } from '../store/hooks.ts'
import { setDrawerOpen } from '../store/ui.ts'
import { hasDrawerContent } from '../lib/drawer.ts'
import Navbar from '../components/layout/Navbar.tsx'
import DrawerMenu from '../components/layout/DrawerMenu.tsx'
import { useHomeConfig } from '../components/layout/HomeConfigProvider.tsx'
import { useProfile } from '../components/layout/ProfileProvider.tsx'
import GoogleSignIn from '../components/ui/GoogleSignIn.tsx'
import { Reveal } from '../components/ui/motion.tsx'

/**
 * The landing page every visitor lands on. Anonymous visitors see the configured content and the
 * Google sign-in; a signed-in user sees a signed-in state with a way to the drawer and to About. The
 * menu button and drawer exist only for a signed-in user (the server session decides, nothing here
 * is trusted).
 */
export default function Landing() {
  const dispatch = useAppDispatch()
  const drawerOpen = useAppSelector((state) => state.ui.drawerOpen)
  const { data } = useGetSessionRoleQuery()
  const role = data ?? null
  const isLoggedIn = role !== null
  const home = useHomeConfig()
  const showMenu = hasDrawerContent(useProfile().nav.drawerItems, role)

  return (
    <div className="drawer">
      <input
        id="nav-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={drawerOpen}
        onChange={(event) => dispatch(setDrawerOpen(event.target.checked))}
      />
      <div className="drawer-content flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 edge-b bg-base-100/80 backdrop-blur">
          <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 lg:px-8">
            <Navbar isLoggedIn={isLoggedIn} role={role} showMenu={showMenu} />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col items-center justify-center px-3 py-16 text-center sm:px-6 lg:px-8">
          <Reveal className="flex max-w-xl flex-col items-center gap-4">
            {isLoggedIn ? (
              <>
                <h1 className="heading-display text-3xl sm:text-5xl">{home.signedInTitle}</h1>
                <p className="text-muted">{home.signedInMessage}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {showMenu && (
                    <label htmlFor="nav-drawer" className="button-primary flex items-center gap-2 cursor-pointer">
                      <Menu size={18} aria-hidden="true" />
                      {home.openMenuLabel}
                    </label>
                  )}
                  <Link href={home.aboutHref} className="button-secondary">
                    {home.aboutLabel}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="heading-display text-3xl sm:text-5xl">{home.title}</h1>
                <p className="text-muted">{home.tagline}</p>
                <div className="mt-4 flex flex-col items-center">
                  <GoogleSignIn
                    signInLabel={home.signInLabel}
                    signingInLabel={home.signingInLabel}
                    restrictedError={home.restrictedError}
                    unknownEmail={home.unknownEmail}
                    failedError={home.failedError}
                  />
                </div>
              </>
            )}
          </Reveal>
        </main>
      </div>
      {showMenu && role && <DrawerMenu role={role} />}
    </div>
  )
}
