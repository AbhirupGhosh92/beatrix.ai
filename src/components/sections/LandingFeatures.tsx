'use client'

import { useHomeConfig } from '../layout/HomeConfigProvider.tsx'
import { LANDING_ICONS } from '../ui/landingIcons.ts'
import { Reveal, Stagger, StaggerItem } from '../ui/motion.tsx'

/** Feature card grid; a card whose result is a placeholder shows the preview badge. */
export default function LandingFeatures() {
  const home = useHomeConfig()
  const { heading, intro, items } = home.features
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-3 py-12 sm:px-6 lg:px-8">
      <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-2 text-center">
        <h2 className="heading-display text-2xl sm:text-3xl">{heading}</h2>
        <p className="text-muted">{intro}</p>
      </Reveal>
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = LANDING_ICONS[item.icon]
          return (
            <StaggerItem key={item.id} className="h-full">
              <article className="feature-card flex h-full flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Icon size={24} className="text-brand" aria-hidden="true" />
                  {item.preview && <span className="preview-badge">{home.previewLabel}</span>}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-muted">{item.description}</p>
              </article>
            </StaggerItem>
          )
        })}
      </Stagger>
    </section>
  )
}
