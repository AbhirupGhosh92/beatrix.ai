'use client'

import { Award, BookOpen, GraduationCap } from 'lucide-react'
import { useProfile } from '../layout/ProfileProvider.tsx'
import Reveal from '../ui/Reveal.tsx'
import SectionHeading from '../ui/SectionHeading.tsx'

export default function Education() {
  const profile = useProfile()
  const { education } = profile

  return (
    <section>
      <SectionHeading id="education" icon={<GraduationCap />} title={education.title} kicker={education.kicker} />
      <div className="grid gap-10 lg:grid-cols-2">
        <Reveal>
          <ul className="steps steps-vertical">
            {education.degrees.map((e) => (
              <li key={e.degree} className="step step-primary">
                <div className="text-left">
                  <p className="font-semibold">{e.degree}</p>
                  <p className="text-meta">
                    {e.school} · {e.period}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="flex flex-col gap-6">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg">
              <Award size={20} aria-hidden="true" className="text-brand-2" />
              {education.certificationsTitle}
            </h3>
            <div className="flex flex-wrap gap-2">
              {education.certifications.map((c) => (
                <span key={c} className="badge badge-secondary badge-lg h-auto py-1 whitespace-normal">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg">
              <BookOpen size={20} aria-hidden="true" className="text-brand-3" />
              {education.publicationsTitle}
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              {education.publications.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
