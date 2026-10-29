'use client'

import { MessageCircle } from 'lucide-react'
import { useProfile } from '../layout/ProfileProvider.tsx'
import Reveal from '../ui/Reveal.tsx'
import SectionHeading from '../ui/SectionHeading.tsx'

export default function About() {
  const profile = useProfile()
  const { about } = profile

  return (
    <section>
      <SectionHeading id="about" icon={<MessageCircle />} title={about.title} kicker={about.kicker} />
      <div className="max-w-3xl">
        {about.chat.map((line, i) => {
          const me = line.from === 'me'
          return (
            <Reveal key={i} delay={i * 60}>
              <div className={`chat ${me ? 'chat-end' : 'chat-start'}`}>
                <div className="avatar avatar-placeholder chat-image">
                  <div className="w-10 rounded-full bg-neutral text-neutral-content">
                    <span className="text-xs">{me ? about.meInitials : about.recruiterInitials}</span>
                  </div>
                </div>
                <div className="chat-header text-xs opacity-70">{me ? about.meName : about.recruiterName}</div>
                <div className={`chat-bubble ${me ? 'chat-bubble-primary' : ''}`}>{line.text}</div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
