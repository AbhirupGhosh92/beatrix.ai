'use client'

import { useHomeConfig } from '../layout/HomeConfigProvider.tsx'
import { LANDING_ICONS } from '../ui/landingIcons.ts'
import { Reveal } from '../ui/motion.tsx'

/** Numbered how-it-works steps. */
export default function LandingSteps() {
  const { howItWorks } = useHomeConfig()
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-3 py-12 sm:px-6 lg:px-8">
      <Reveal className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="heading-display text-2xl sm:text-3xl">{howItWorks.heading}</h2>
          <p className="text-muted">{howItWorks.intro}</p>
        </div>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {howItWorks.steps.map((step, index) => {
            const Icon = LANDING_ICONS[step.icon]
            return (
              <li key={`${index}-${step.title}`} className="feature-card flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-brand text-2xl font-semibold" aria-hidden="true">
                    {index + 1}
                  </span>
                  <Icon size={22} className="text-brand" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-muted">{step.description}</p>
              </li>
            )
          })}
        </ol>
      </Reveal>
    </section>
  )
}
