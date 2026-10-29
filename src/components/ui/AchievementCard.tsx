'use client'


import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import type { Achievement } from '../../data/profile.ts'
import { useProfile } from '../layout/ProfileProvider.tsx'

type Mode = 'pain' | 'solution' | null

/** How far the handle must be from the middle (fraction of the width) before a side counts as dominant. */
const DOMINANT_MARGIN = 0.05

/**
 * A draggable daisyUI diff (before/after) card. While the red (before) side covers most of the
 * card it lists the pain points; while the green (after) side does, it lists the solutions.
 * daisyUI's diff is pure CSS (the handle is `.diff-resizer`, a CSS-resizable element), so the
 * handle position is read with a ResizeObserver on it.
 */
export default function AchievementCard({ achievement }: { achievement: Achievement }) {
  const profile = useProfile()
  const { title, context, before, after, pains, solutions } = achievement
  const { painTitle, solutionTitle, revealHint } = profile.experience.achievements
  const figureRef = useRef<HTMLElement>(null)
  const [mode, setMode] = useState<Mode>(null)

  useEffect(() => {
    const figure = figureRef.current
    const handle = figure?.querySelector<HTMLElement>('.diff-resizer')
    if (!figure || !handle) return
    const observer = new ResizeObserver(([entry]) => {
      // The handle's width is the width of the red (before) side.
      const redShare = entry.contentRect.width / figure.clientWidth
      setMode(redShare > 0.5 + DOMINANT_MARGIN ? 'pain' : redShare < 0.5 - DOMINANT_MARGIN ? 'solution' : null)
    })
    observer.observe(handle)
    return () => observer.disconnect()
  }, [])

  const items = mode === 'pain' ? pains : mode === 'solution' ? solutions : []

  return (
    <div>
      <p className="font-semibold">{title}</p>
      <p className="mb-2 text-sm opacity-80">{context}</p>
      <figure ref={figureRef} className="diff aspect-16/7 w-full border border-base-300" tabIndex={0}>
        <div className="diff-item-1" role="img" aria-label={`${title}, ${before.label.toLowerCase()}: ${before.value}`}>
          <div className="grid h-full content-center justify-items-start bg-error px-6 text-left text-error-content sm:px-10">
            <p className="text-sm uppercase">{before.label}</p>
            <p className="font-display text-3xl sm:text-4xl">{before.value}</p>
          </div>
        </div>
        <div className="diff-item-2" role="img" aria-label={`${title}, ${after.label.toLowerCase()}: ${after.value}`}>
          <div className="grid h-full content-center justify-items-end bg-success px-6 text-right text-success-content sm:px-10">
            <p className="text-sm uppercase">{after.label}</p>
            <p className="font-display text-3xl sm:text-4xl">{after.value}</p>
          </div>
        </div>
        <div className="diff-resizer" />
      </figure>

      <div className="mt-3 min-h-28 text-sm sm:text-base" aria-live="polite">
        {mode === null ? (
          <p className="opacity-80">{revealHint}</p>
        ) : (
          // keyed by mode so the list remounts and its items animate in again on every switch
          <div key={mode} className={`border-l-4 pl-3 ${mode === 'pain' ? 'border-error' : 'border-success'}`}>
            <p className={`mb-1 font-display text-sm uppercase ${mode === 'pain' ? 'text-pain' : 'text-gain'}`}>
              {mode === 'pain' ? painTitle : solutionTitle}
            </p>
            <ul>
              {items.map((item, i) => (
                <li key={item} style={{ '--i': i } as CSSProperties} className="reveal-item flex gap-2 py-1">
                  {mode === 'pain' ? (
                    <TriangleAlert size={16} className="mt-1 shrink-0 text-pain" aria-hidden="true" />
                  ) : (
                    <Check size={16} className="mt-1 shrink-0 text-gain" aria-hidden="true" />
                  )}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
