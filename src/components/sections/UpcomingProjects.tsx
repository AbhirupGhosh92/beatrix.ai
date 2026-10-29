'use client'

import { useState } from 'react'
import { FolderKanban, Lock, CheckCircle2 } from 'lucide-react'
import { signInWithPopup, signOut } from 'firebase/auth'
import { getFirebaseAuth, getGoogleProvider, isEmailAllowed } from '../../lib/firebase.ts'
import { useProfile } from '../layout/ProfileProvider.tsx'
import SectionHeading from '../ui/SectionHeading.tsx'
import Reveal from '../ui/Reveal.tsx'

function GoogleIcon() {
  return (
    <svg className="gsi-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  )
}

interface UpcomingProjectsProps {
  isLoggedIn: boolean
  onLogin: () => void
}

export default function UpcomingProjects({ isLoggedIn, onLogin }: UpcomingProjectsProps) {
  const profile = useProfile()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const upcoming = profile.upcomingProjects

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true)
    setLoginError(null)

    const auth = getFirebaseAuth()
    if (!auth || auth.app.options.apiKey === 'demo-api-key') {
      setTimeout(() => {
        setIsLoggingIn(false)
        onLogin()
      }, 500)
      return
    }

    try {
      const credential = await signInWithPopup(auth, getGoogleProvider())
      const user = credential.user
      const allowed = await isEmailAllowed(user.email)

      if (!allowed) {
        await signOut(auth)
        setLoginError(upcoming.lock.restrictedError.replace('{email}', user.email || upcoming.lock.unknownEmail))
        return
      }

      onLogin()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : upcoming.lock.failedError
      setLoginError(errorMsg)
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <section id="upcoming">
      <SectionHeading
        id="upcoming-projects-heading"
        icon={<FolderKanban />}
        title={upcoming.title}
        kicker={upcoming.kicker}
      />

      {!isLoggedIn ? (
        <div className="relative rounded-2xl border border-base-300 bg-base-200/50 p-6 sm:p-8 overflow-hidden">
          {/* Shimmer / Skeleton placeholders representing upcoming project cards */}
          <div className="grid gap-6 md:grid-cols-3 select-none pointer-events-none filter blur-[2px] opacity-60">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card border border-base-300 bg-base-200 p-6 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="skeleton h-5 w-24 rounded" />
                    <div className="skeleton h-4 w-20 rounded" />
                  </div>
                  <div className="skeleton h-6 w-3/4 rounded mb-3" />
                  <div className="skeleton h-4 w-full rounded mb-2" />
                  <div className="skeleton h-4 w-5/6 rounded" />
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="skeleton h-5 w-14 rounded-full" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Centered overlay containing the Google Sign In CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-100/75 backdrop-blur-sm p-4 text-center z-10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-200 border border-base-300 shadow-sm">
              <Lock className="text-brand" size={22} />
            </div>
            <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wide mb-2">
              {upcoming.lock.title}
            </h3>
            <p className="max-w-md text-sm text-base-content/80 mb-6">
              {upcoming.lock.description}
            </p>

            {loginError && (
              <div className="mb-4 text-xs text-error font-medium">{loginError}</div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="gsi-button"
            >
              {isLoggingIn ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  {upcoming.lock.signingInLabel}
                </>
              ) : (
                <>
                  <GoogleIcon />
                  {upcoming.lock.signInLabel}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {upcoming.items.map((item, idx) => (
            <Reveal key={item.id} delay={idx * 100} className="flex">
              <div className="hover-3d w-full">
                <div className="card h-full border border-base-300 bg-base-200 transition-[transform,scale,outline-color,border-color] duration-500 hover:border-primary/50">
                  <div className="card-body flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="badge badge-primary">{item.status}</span>
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 size={14} /> {upcoming.unlockedLabel}
                        </span>
                      </div>
                      <h3 className="card-title text-xl mb-2">{item.title}</h3>
                      <p className="text-sm opacity-80">{item.description}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="badge badge-outline text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  )
}
