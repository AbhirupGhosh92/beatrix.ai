'use client'

import { useHomeConfig } from '../layout/HomeConfigProvider.tsx'
import GoogleSignIn from '../ui/GoogleSignIn.tsx'
import { Reveal } from '../ui/motion.tsx'

/** Closing call to action with the sign-in button. */
export default function LandingClosing() {
  const home = useHomeConfig()
  return (
    <section className="px-3 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4">
        <h2 className="heading-display text-2xl sm:text-3xl">{home.closing.title}</h2>
        <p className="text-muted">{home.closing.message}</p>
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
