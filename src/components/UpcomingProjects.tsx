'use client'

import { useState } from 'react'
import { FolderKanban, Lock, CheckCircle2, X } from 'lucide-react'
import { signInWithPopup } from 'firebase/auth'
import { getFirebaseAuth, getGoogleProvider } from '../lib/firebase.ts'
import { profile } from '../data/profile.ts'
import SectionHeading from './SectionHeading.tsx'
import Reveal from './Reveal.tsx'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

interface UpcomingProjectsProps {
  isLoggedIn: boolean
  onLogin: () => void
}

export default function UpcomingProjects({ isLoggedIn, onLogin }: UpcomingProjectsProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const upcoming = profile.upcomingProjects ?? {
    kicker: 'FUTURE INNOVATIONS',
    title: 'Upcoming Projects',
    items: [
      {
        id: 'agentic-ai',
        title: 'Agentic AI Multi-Agent Platform',
        description: 'An autonomous AI agent orchestrator designed to solve complex multi-step developer workflows.',
        tags: ['AI/ML', 'Next.js', 'Python'],
        status: 'In Development',
      },
      {
        id: 'android-nextgen',
        title: 'NextGen Android AI Companion',
        description: 'On-device LLM integration with real-time audio and vision processing for high-performance mobile devices.',
        tags: ['Android', 'Kotlin', 'On-Device AI'],
        status: 'Planning',
      },
      {
        id: 'spatial-dashboard',
        title: 'Cyberpunk Analytics Dashboard',
        description: 'Interactive real-time telemetry visualization with high-fps webgl shader graphics.',
        tags: ['React', 'Three.js', 'TailwindCSS'],
        status: 'Prototyping',
      },
    ],
  }

  const handleCardClick = (projectTitle: string) => {
    setSelectedProjectTitle(projectTitle)
    setLoginError(null)
    if (!isLoggedIn) {
      setShowModal(true)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true)
    setLoginError(null)

    const auth = getFirebaseAuth()
    if (!auth || auth.app.options.apiKey === 'demo-api-key') {
      setTimeout(() => {
        setIsLoggingIn(false)
        setShowModal(false)
        onLogin()
      }, 500)
      return
    }

    try {
      await signInWithPopup(auth, getGoogleProvider())
      setShowModal(false)
      onLogin()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Google authentication failed. Please try again.'
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

      <div className="grid gap-6 md:grid-cols-3">
        {upcoming.items.map((item, idx) => (
          <Reveal key={item.id} delay={idx * 100} className="flex">
            <div
              onClick={() => handleCardClick(item.title)}
              className="hover-3d w-full cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCardClick(item.title)
                }
              }}
            >
              <div className="card h-full border border-base-300 bg-base-200 transition-colors hover:border-primary/50">
                <div className="card-body flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="badge badge-primary">{item.status}</span>
                      {!isLoggedIn ? (
                        <span className="flex items-center gap-1 text-xs text-brand-2">
                          <Lock size={14} /> Login required
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 size={14} /> Unlocked
                        </span>
                      )}
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

      {showModal && (
        <div className="modal modal-open z-50">
          <div className="modal-box relative z-10 border border-base-300 bg-base-100 max-w-md p-6 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-base-200">
                <Lock className="text-brand" size={24} />
              </div>

              <h3 className="font-display text-2xl uppercase tracking-wide">
                Firebase Google Login
              </h3>
              <p className="mt-2 text-sm text-base-content/80">
                Please sign in with your Google account via Firebase Auth to access details for{' '}
                <span className="font-semibold text-brand-2">
                  {selectedProjectTitle}
                </span>{' '}
                and activate the sidebar menu.
              </p>

              {loginError && (
                <div className="mt-3 text-xs text-error">{loginError}</div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="btn btn-neutral w-full border border-base-300 gap-3 hover:bg-base-200"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Authenticating via Firebase...
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      Sign in with Google (Firebase)
                    </>
                  )}
                </button>
              </div>

              <p className="mt-4 text-xs text-base-content/50">
                Authenticates via Firebase Google Auth Provider.
              </p>
            </div>
          </div>
          <div
            className="modal-backdrop bg-neutral-900/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
        </div>
      )}
    </section>
  )
}
