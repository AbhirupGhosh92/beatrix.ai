'use client'

import { useHomeConfig } from '../layout/HomeConfigProvider.tsx'
import GoogleSignIn from '../ui/GoogleSignIn.tsx'
import { Reveal } from '../ui/motion.tsx'

/** Headline, value proposition and sign-in of the anonymous landing page (the page's only h1). */
export default function LandingHero() {
  const home = useHomeConfig()
  return (
    <section className="px-3 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <p className="text-meta-strong text-brand">{home.eyebrow}</p>
        <h1 className="heading-display text-3xl sm:text-5xl">{home.title}</h1>
        <p className="text-muted text-lg">{home.tagline}</p>
        <div className="mt-4 flex flex-col items-center">
          <GoogleSignIn
            signInLabel={home.signInLabel}
            signingInLabel={home.signingInLabel}
            restrictedError={home.restrictedError}
            unknownEmail={home.unknownEmail}
            failedError={home.failedError}
          />
        </div>
      </Reveal>
    </section>
  )
}
