'use client'

import { Briefcase, Gamepad2, MapPin, Smartphone, Sparkles, type LucideIcon } from 'lucide-react'
import type { Role } from '../../data/profile.ts'
import { useProfile } from '../layout/ProfileProvider.tsx'
import AchievementCard from '../ui/AchievementCard.tsx'
import Reveal from '../ui/Reveal.tsx'
import SectionHeading from '../ui/SectionHeading.tsx'

const ICONS: Record<Role['icon'], LucideIcon> = {
  ai: Sparkles,
  android: Smartphone,
  games: Gamepad2,
}

export default function Experience() {
  const profile = useProfile()
  const { experience } = profile
  const { achievements, roles } = experience

  return (
    <section>
      <SectionHeading id="experience" icon={<Briefcase />} title={experience.title} kicker={experience.kicker} />

      <div className="mb-12">
        <h3 className="text-xl">{achievements.title}</h3>
        <p className="mt-1 mb-4 text-sm opacity-80">{achievements.hint}</p>
        <div className="grid gap-6 md:grid-cols-2">
          {achievements.items.map((a, i) => (
            <Reveal key={a.title} delay={i * 80}>
              <AchievementCard achievement={a} />
            </Reveal>
          ))}
        </div>
      </div>

      <ul className="timeline timeline-vertical timeline-snap-icon max-md:timeline-compact">
        {roles.map((role, i) => {
          const Icon = ICONS[role.icon]
          return (
            <li key={role.company}>
              {i > 0 && <hr />}
              <div className="timeline-start mb-10 self-start md:text-end">
                <time className="font-display text-sm text-brand-2">{role.period}</time>
                <div className="text-lg font-bold">{role.company}</div>
                {role.client && <div className="text-sm opacity-70">{role.client}</div>}
                {role.location && (
                  <div className="inline-flex items-center gap-1 text-xs opacity-60">
                    <MapPin size={12} aria-hidden="true" />
                    {role.location}
                  </div>
                )}
              </div>
              <div className="timeline-middle">
                <span className="grid size-9 place-content-center rounded-full bg-primary text-primary-content">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <div className="timeline-end mb-10 w-full min-w-0">
                <Reveal>
                  <h3 className="mb-3 text-lg">{role.title}</h3>
                  <div className="flex flex-col gap-2">
                    {role.programs.map((program, pi) => (
                      <div key={program.name} className="collapse-arrow collapse border border-base-300 bg-base-200">
                        <input
                          type="radio"
                          name={`exp-${i}`}
                          defaultChecked={pi === 0}
                          aria-label={program.name}
                        />
                        <div className="collapse-title font-semibold">{program.name}</div>
                        <div className="collapse-content">
                          <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                            {program.bullets.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              {i < roles.length - 1 && <hr />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
