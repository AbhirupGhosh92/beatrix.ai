'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase.ts'
import Navbar from '../components/Navbar.tsx'
import DrawerMenu from '../components/DrawerMenu.tsx'
import Hero from '../components/Hero.tsx'
import Stats from '../components/Stats.tsx'
import About from '../components/About.tsx'
import Experience from '../components/Experience.tsx'
import Skills from '../components/Skills.tsx'
import Education from '../components/Education.tsx'
import BeyondCode from '../components/BeyondCode.tsx'
import UpcomingProjects from '../components/UpcomingProjects.tsx'
import Footer from '../components/Footer.tsx'
import BackToTop from '../components/BackToTop.tsx'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true)
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
        <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/80 backdrop-blur">
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
