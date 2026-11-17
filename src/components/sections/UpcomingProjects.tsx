'use client'

import { FolderKanban, Lock, CheckCircle2 } from 'lucide-react'
import { useProfile } from '../layout/ProfileProvider.tsx'
import GoogleSignIn from '../ui/GoogleSignIn.tsx'
import SectionHeading from '../ui/SectionHeading.tsx'
import Reveal from '../ui/Reveal.tsx'

interface UpcomingProjectsProps {
  isLoggedIn: boolean
}

export default function UpcomingProjects({ isLoggedIn }: UpcomingProjectsProps) {
  const profile = useProfile()

  const upcoming = profile.upcomingProjects

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
              <div key={i} className="card surface p-6 flex flex-col justify-between gap-4">
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
            <div className="surface mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full shadow-sm">
              <Lock className="text-brand" size={22} />
            </div>
            <h3 className="heading-display text-xl sm:text-2xl mb-2">
              {upcoming.lock.title}
            </h3>
            <p className="max-w-md text-sm text-base-content/80 mb-6">
              {upcoming.lock.description}
            </p>

            <GoogleSignIn
              signInLabel={upcoming.lock.signInLabel}
              signingInLabel={upcoming.lock.signingInLabel}
              restrictedError={upcoming.lock.restrictedError}
              unknownEmail={upcoming.lock.unknownEmail}
              failedError={upcoming.lock.failedError}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {upcoming.items.map((item, idx) => (
            <Reveal key={item.id} delay={idx * 100} className="flex">
              <div className="hover-3d w-full">
                <div className="card surface h-full transition-[transform,scale,outline-color,border-color] duration-500 hover:border-primary/50">
                  <div className="card-body flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="badge badge-primary">{item.status}</span>
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 size={14} /> {upcoming.unlockedLabel}
                        </span>
                      </div>
                      <h3 className="card-title text-xl mb-2">{item.title}</h3>
                      <p className="text-meta-strong">{item.description}</p>
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
