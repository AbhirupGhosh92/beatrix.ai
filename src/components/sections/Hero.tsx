'use client'

import { CodeXml, Download, MapPin, Users } from 'lucide-react'
import { useProfile } from '../layout/ProfileProvider.tsx'
import Avatar from '../ui/Avatar.tsx'
import CopyEmailButton from '../ui/CopyEmailButton.tsx'

export default function Hero() {
  const profile = useProfile()
  const { person, contact, labels, hero } = profile

  return (
    <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.3fr_1fr] lg:py-12">
      <div className="order-2 lg:order-1">
        <div className="badge badge-outline mb-4 gap-2 py-4">
          <span className="inline-grid *:[grid-area:1/1]">
            <span className="status status-success animate-ping" />
            <span className="status status-success" />
          </span>
          {person.availability}
        </div>

        <h1 className="glitch-hover w-fit text-4xl sm:text-6xl">{person.name}</h1>

        <p className="mt-4 text-xl sm:text-3xl">
          {person.title} · {hero.rotatingPrefix}{' '}
          <span className="text-rotate font-display text-brand duration-[8000ms]">
            <span>
              {hero.rotating.map((word) => (
                <span key={word}>{word}</span>
              ))}
            </span>
          </span>
        </p>

        <p className="mt-2 flex items-center gap-2 opacity-80">
          <MapPin size={16} aria-hidden="true" />
          {person.location} · {person.tagline}
        </p>

        <p className="mt-6 max-w-2xl opacity-90">{person.summary}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a className="button-primary" href={person.resumeFile} download>
            <Download size={18} aria-hidden="true" />
            {labels.downloadResume}
          </a>
          <a className="button-secondary" href={contact.linkedin} target="_blank" rel="noreferrer">
            <Users size={18} aria-hidden="true" />
            {labels.linkedin}
          </a>
          <a className="button-accent" href={contact.github} target="_blank" rel="noreferrer">
            <CodeXml size={18} aria-hidden="true" />
            {labels.github}
          </a>
          <CopyEmailButton />
        </div>
      </div>

      <div className="order-1 flex justify-center lg:order-2">
        <Avatar />
      </div>
    </section>
  )
}
