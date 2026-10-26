// Typed loader for src/data/profile.json. ALL site content (copy, labels,
// metrics, links) lives in the JSON file; components read it from here and
// contain no hardcoded text. Facts and metrics come from the resume; do not add
// numbers that are not in it.

// profile.json is private and git-ignored; next.config.ts aliases
// `profile-data` to it, or to the committed placeholder example when it is
// missing. tsconfig `paths` points the alias at the example for typing.
import raw from 'profile-data'

export interface Stat {
  value: number
  prefix?: string
  suffix?: string
  label: string
  desc: string
}

export interface Program {
  name: string
  bullets: string[]
}

export interface Role {
  company: string
  client?: string
  title: string
  period: string
  location: string
  icon: 'ai' | 'android' | 'games'
  programs: Program[]
}

export interface ChatLine {
  from: 'recruiter' | 'me'
  text: string
}

export interface DiffSide {
  label: string
  value: string
}

export interface Achievement {
  title: string
  context: string
  before: DiffSide
  after: DiffSide
  /** shown while the red (before) side covers most of the card */
  pains: string[]
  /** shown while the green (after) side covers most of the card */
  solutions: string[]
}

export interface Profile {
  site: { brand: string }
  nav: {
    closeSidebarLabel: string
    moreLabel: string
    toggleThemeLabel: string
    backToTopLabel: string
    drawerItems: string[]
    dropdownItems: { label: string; icon: 'user' | 'settings' | 'log-out' }[]
  }
  person: {
    name: string
    initials: string
    title: string
    tagline: string
    location: string
    availability: string
    summary: string
    /** photo path under public/; initials are shown if it does not load */
    avatar: string
    /** resume download path under public/ (swap in a PDF here) */
    resumeFile: string
  }
  contact: { email: string; linkedin: string; github: string }
  labels: {
    downloadResume: string
    resume: string
    email: string
    copyEmail: string
    emailCopied: string
    linkedin: string
    github: string
  }
  hero: { rotatingPrefix: string; rotating: string[] }
  stats: Stat[]
  about: {
    kicker: string
    title: string
    meName: string
    meInitials: string
    recruiterName: string
    recruiterInitials: string
    chat: ChatLine[]
  }
  experience: {
    kicker: string
    title: string
    achievements: {
      title: string
      hint: string
      revealHint: string
      painTitle: string
      solutionTitle: string
      items: Achievement[]
    }
    roles: Role[]
  }
  skills: { kicker: string; title: string; groups: { group: string; items: string[] }[] }
  education: {
    kicker: string
    title: string
    degrees: { degree: string; school: string; period: string }[]
    certificationsTitle: string
    certifications: string[]
    publicationsTitle: string
    publications: string[]
  }
  beyondCode: {
    kicker: string
    title: string
    gaming: { title: string; blurb: string; badge: string }
    travel: { title: string; visited: string[]; nextLabel: string; next: string }
    coding: { title: string; blurb: string; loading: string }
  }
  footer: { copyrightHolder: string }
}

export const profile = raw as Profile
