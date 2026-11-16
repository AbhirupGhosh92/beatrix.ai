'use client'


import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Check, GripVertical, TriangleAlert } from 'lucide-react'
import type { Achievement } from '../../data/profile.ts'
import { useProfile } from '../layout/ProfileProvider.tsx'

type Mode = 'pain' | 'solution' | null

/** How far the divider must be from the middle (percent of the width) before a side counts as dominant. */
const DOMINANT_MARGIN = 5
/** Keyboard step, in percent of the card width. */
const KEY_STEP = 5

const clamp = (n: number) => Math.min(100, Math.max(0, n))

/**
 * A before/after card with a draggable divider. The divider position is the red (before) share in
 * percent, held in state. Only the grip captures pointers (`touch-action: pan-y` in
 * `achievement-card.css`), so mouse, touch and pen all drag it smoothly while vertical swipes still
 * scroll the page. While the red side covers most of the card it lists the pain points; while the
 * green (after) side does, it lists the solutions.
 */
export default function AchievementCard({ achievement }: { achievement: Achievement }) {
  const profile = useProfile()
  const { title, context, before, after, pains, solutions } = achievement
  const { painTitle, solutionTitle, revealHint } = profile.experience.achievements
  const figureRef = useRef<HTMLElement>(null)
  const [position, setPosition] = useState(50)
  const [dragging, setDragging] = useState(false)

  const moveTo = (clientX: number) => {
    const rect = figureRef.current?.getBoundingClientRect()
    if (rect && rect.width > 0) setPosition(clamp(((clientX - rect.left) / rect.width) * 100))
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    moveTo(e.clientX)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) moveTo(e.clientX)
  }
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next =
      e.key === 'ArrowLeft' ? position - KEY_STEP
      : e.key === 'ArrowRight' ? position + KEY_STEP
      : e.key === 'Home' ? 0
      : e.key === 'End' ? 100
      : null
    if (next === null) return
    e.preventDefault()
    setPosition(clamp(next))
  }

  const mode: Mode =
    position > 50 + DOMINANT_MARGIN ? 'pain' : position < 50 - DOMINANT_MARGIN ? 'solution' : null

  const items = mode === 'pain' ? pains : mode === 'solution' ? solutions : []

  return (
    <div>
      <p className="font-semibold">{title}</p>
      <p className="mb-2 text-meta-strong">{context}</p>
      <figure
        ref={figureRef}
        className="achievement-diff aspect-16/7 w-full border border-base-300"
        data-dragging={dragging || undefined}
        style={{ '--position': `${position}%` } as CSSProperties}
      >
        <div className="achievement-diff-after" role="img" aria-label={`${title}, ${after.label.toLowerCase()}: ${after.value}`}>
          <div className="grid h-full content-center justify-items-end bg-success px-6 text-right text-success-content sm:px-10">
            <p className="text-sm uppercase">{after.label}</p>
            <p className="font-display text-3xl sm:text-4xl">{after.value}</p>
          </div>
        </div>
        <div className="achievement-diff-before" role="img" aria-label={`${title}, ${before.label.toLowerCase()}: ${before.value}`}>
          <div className="grid h-full content-center justify-items-start bg-error px-6 text-left text-error-content sm:px-10">
            <p className="text-sm uppercase">{before.label}</p>
            <p className="font-display text-3xl sm:text-4xl">{before.value}</p>
          </div>
        </div>
        <div
          className="achievement-diff-grip"
          role="slider"
          tabIndex={0}
          aria-label={`${title}: before and after`}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${Math.round(position)}% ${before.label.toLowerCase()}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        >
          <GripVertical size={16} aria-hidden="true" />
        </div>
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
