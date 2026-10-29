import type { ReactNode } from 'react'

export default function SectionHeading({
  id,
  icon,
  title,
  kicker,
}: {
  id?: string
  icon: ReactNode
  title: string
  kicker?: string
}) {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      {kicker && <p className="text-sm tracking-widest text-brand-2 uppercase">{kicker}</p>}
      <h2 className="flex items-center gap-3 text-2xl sm:text-3xl">
        <span className="text-brand">{icon}</span>
        {title}
      </h2>
      <div className="mt-3 h-1 w-24 bg-linear-to-r from-primary via-secondary to-accent" />
    </div>
  )
}
