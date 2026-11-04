'use client'

import { useGetSessionRoleQuery } from '../store/api.ts'
import { useAppDispatch, useAppSelector } from '../store/hooks.ts'
import { setDrawerOpen } from '../store/ui.ts'
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
import { ScrollProgress } from '../components/ui/motion.tsx'

export default function Home() {
  // The server's session decides who is logged in and what role they hold; nothing here is trusted.
  // The role lives in the store (null when logged out or unreachable).
  const dispatch = useAppDispatch()
  const drawerOpen = useAppSelector((state) => state.ui.drawerOpen)
  const { data } = useGetSessionRoleQuery()
  const role = data ?? null
  const isLoggedIn = role !== null
  // No menu button and no drawer when there is nothing to list for this user.
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
      <div className="drawer-content flex flex-col min-h-screen">
        <ScrollProgress />
        {/* Fixed (sticky) header: full-width bar so it spans the page, content capped inside. */}
        <header className="sticky top-0 z-30 edge-b bg-base-100/80 backdrop-blur">
          <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 lg:px-8">
            <Navbar isLoggedIn={isLoggedIn} role={role} showMenu={showMenu} />
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
            <UpcomingProjects isLoggedIn={isLoggedIn} />
          </main>
        </div>
        <Footer />
        <BackToTop />
      </div>
      {showMenu && role && <DrawerMenu role={role} />}
    </div>
  )
}
