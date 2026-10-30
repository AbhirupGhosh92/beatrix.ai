'use client'

import { useState, useEffect, useCallback } from 'react'
import { isRole, type Role } from '../lib/access.ts'
import { hasDrawerContent } from '../lib/drawer.ts'
import Navbar from '../components/layout/Navbar.tsx'
import { useProfile } from '../components/layout/ProfileProvider.tsx'
import DrawerMenu from '../components/layout/DrawerMenu.tsx'
import Hero from '../components/sections/Hero.tsx'
import Stats from '../components/sections/Stats.tsx'
import About from '../components/sections/About.tsx'
import Experience from '../components/sections/Experience.tsx'
import Skills from '../components/sections/Skills.tsx'
import Education from '../components/sections/Education.tsx'
import BeyondCode from '../components/sections/BeyondCode.tsx'
import UpcomingProjects from '../components/sections/UpcomingProjects.tsx'
import Footer from '../components/layout/Footer.tsx'
import BackToTop from '../components/layout/BackToTop.tsx'

/** The current session's role from the server, or null when logged out or unreachable. */
async function fetchSessionRole(): Promise<Role | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' })
    const data = res.ok ? await res.json() : null
    return isRole(data?.role) ? data.role : null
  } catch {
    return null
  }
}

export default function Home() {
  // The server's session decides who is logged in and what role they hold; nothing here is trusted.
  const [role, setRole] = useState<Role | null>(null)
  const isLoggedIn = role !== null
  // No menu button and no drawer when there is nothing to list for this user.
  const showMenu = hasDrawerContent(useProfile().nav.drawerItems, role)

  const refreshSession = useCallback(async () => setRole(await fetchSessionRole()), [])

  useEffect(() => {
    let ignore = false
    fetchSessionRole().then((current) => {
      if (!ignore) setRole(current)
    })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="drawer">
      <input id="nav-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen">
        {/* Fixed (sticky) header: full-width bar so it spans the page, content capped inside. */}
        <header className="sticky top-0 z-30 edge-b bg-base-100/80 backdrop-blur">
          <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 lg:px-8">
            <Navbar isLoggedIn={isLoggedIn} showMenu={showMenu} onLogout={() => setRole(null)} />
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
          <main className="flex flex-col gap-16 py-6 sm:gap-20">
            <Hero />
            <Stats />
            <About />
            <Experience />
            <Skills />
            <Education />
            <BeyondCode />
            <UpcomingProjects isLoggedIn={isLoggedIn} onLogin={refreshSession} />
          </main>
        </div>
        <Footer />
        <BackToTop />
      </div>
      {showMenu && role && <DrawerMenu role={role} />}
    </div>
  )
}
