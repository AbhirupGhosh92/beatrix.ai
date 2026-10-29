'use client'

import { CodeXml, Download, Mail, Users } from 'lucide-react'
import { useProfile } from './ProfileProvider.tsx'

const linkClass = 'hover-subtle inline-flex items-center gap-2 px-3 py-1'

export default function Footer() {
  const profile = useProfile()
  const { person, contact, labels, footer } = profile

  return (
    <footer className="flex flex-col items-center gap-6 bg-neutral px-10 pt-10 pb-24 text-center text-neutral-content">
      <aside>
        <p className="font-display text-xl">{person.name}</p>
        <p>
          {person.title} · {person.tagline}
        </p>
        <p className="text-sm opacity-85">
          {person.location} · {person.availability}
        </p>
      </aside>
      <nav className="grid grid-flow-row gap-2 sm:grid-flow-col sm:gap-4">
        <a className={linkClass} href={`mailto:${contact.email}`}>
          <Mail size={18} aria-hidden="true" />
          {labels.email}
        </a>
        <a className={linkClass} href={contact.linkedin} target="_blank" rel="noreferrer">
          <Users size={18} aria-hidden="true" />
          {labels.linkedin}
        </a>
        <a className={linkClass} href={contact.github} target="_blank" rel="noreferrer">
          <CodeXml size={18} aria-hidden="true" />
          {labels.github}
        </a>
        <a className={linkClass} href={person.resumeFile} download>
          <Download size={18} aria-hidden="true" />
          {labels.resume}
        </a>
      </nav>
      <aside>
        <p className="text-xs opacity-85">
          © {new Date().getFullYear()} {footer.copyrightHolder}
        </p>
      </aside>
    </footer>
  )
}
