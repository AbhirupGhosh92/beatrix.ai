import { CodeXml, Gamepad2, Plane, Rocket } from 'lucide-react'
import { profile } from '../data/profile.ts'
import TiltCard from './TiltCard.tsx'
import SectionHeading from './SectionHeading.tsx'

export default function BeyondCode() {
  const { beyondCode } = profile
  const { gaming, travel, coding } = beyondCode

  return (
    <section>
      <SectionHeading id="beyond" icon={<Rocket />} title={beyondCode.title} kicker={beyondCode.kicker} />
      <div className="grid gap-6 md:grid-cols-3">
        <TiltCard delay={0}>
          <h3 className="card-title">
            <Gamepad2 className="text-brand" aria-hidden="true" />
            {gaming.title}
          </h3>
          <p>{gaming.blurb}</p>
          <div className="card-actions">
            <span className="badge badge-primary">{gaming.badge}</span>
          </div>
        </TiltCard>

        <TiltCard delay={100}>
          <h3 className="card-title">
            <Plane className="text-brand-2" aria-hidden="true" />
            {travel.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            {travel.visited.map((city) => (
              <span key={city} className="badge badge-outline">
                {city}
              </span>
            ))}
          </div>
          <div className="card-actions items-center">
            <span className="indicator">
              <span className="indicator-item status status-secondary animate-ping" />
              <span className="indicator-item status status-secondary" />
              <span className="badge badge-secondary">
                {travel.nextLabel}: {travel.next}
              </span>
            </span>
          </div>
        </TiltCard>

        <TiltCard delay={200}>
          <h3 className="card-title">
            <CodeXml className="text-brand-3" aria-hidden="true" />
            {coding.title}
          </h3>
          <p>{coding.blurb}</p>
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
          </div>
          <div className="card-actions items-center gap-2">
            <span className="loading loading-dots text-brand-3" />
            <span className="text-sm opacity-70">{coding.loading}</span>
          </div>
        </TiltCard>
      </div>
    </section>
  )
}
