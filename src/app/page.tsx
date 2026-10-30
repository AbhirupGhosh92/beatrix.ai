'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirebaseAuth, isEmailAllowed } from '../lib/firebase.ts'
import { registerCurrentUser } from '../lib/register-user.ts'
import Navbar from '../components/layout/Navbar.tsx'
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

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await registerCurrentUser()
        const allowed = await isEmailAllowed(user.email)
        if (allowed) {
          setIsLoggedIn(true)
        } else {
          console.warn(`User email ${user.email} is not in the allowed emails datastore. Signing out.`)
          await signOut(auth)
          setIsLoggedIn(false)
        }
      } else {
        setIsLoggedIn(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = () => {
    setIsLoggedIn(true)
  }

  return (
    <div className="drawer">
      <input id="nav-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen">
        {/* Fixed (sticky) header: full-width bar so it spans the page, content capped inside. */}
        <header className="sticky top-0 z-30 edge-b bg-base-100/80 backdrop-blur">
          <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 lg:px-8">
            <Navbar isLoggedIn={isLoggedIn} />
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
            <UpcomingProjects isLoggedIn={isLoggedIn} onLogin={handleLogin} />
          </main>
        </div>
        <Footer />
        <BackToTop />
      </div>
      {isLoggedIn && <DrawerMenu />}
    </div>
  )
}
