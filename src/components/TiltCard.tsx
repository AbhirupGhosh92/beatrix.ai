'use client'

import type { ReactNode } from 'react'
import Reveal from './Reveal.tsx'

/**
 * The one card used wherever a section shows tilting cards (daisyUI hover-3d). Pass
 * `onActivate` to make it a clickable button. Hover look lives in the `.tilt-card`
 * rules in index.css, so every card behaves identically.
 */
export default function TiltCard({
  children,
  delay = 0,
  bodyClassName = '',
  onActivate,
}: {
  children: ReactNode
  delay?: number
  bodyClassName?: string
  onActivate?: () => void
}) {
  return (
    <Reveal delay={delay} className="flex">
      <div
        className={`hover-3d w-full${onActivate ? ' cursor-pointer' : ''}`}
        {...(onActivate && {
          role: 'button',
          tabIndex: 0,
          onClick: onActivate,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onActivate()
            }
          },
        })}
      >
        <div className="tilt-card card h-full">
          <div className={`card-body ${bodyClassName}`}>{children}</div>
        </div>
        {/* hover-3d needs 8 empty cells that track the pointer */}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} />
        ))}
      </div>
    </Reveal>
  )
}
