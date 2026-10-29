'use client'


import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { profile } from '../data/profile.ts'

/** Distance from the bottom (px) within which the button counts as "at the bottom". */
const BOTTOM_THRESHOLD = 120

/**
 * Floating bottom-center button that pops in only at the bottom of the page, wibbles to
 * attract attention, and scrolls back to the top. Styles live in index.css (.back-to-top).
 */
export default function BackToTop() {
  const [atBottom, setAtBottom] = useState(false)

  useEffect(() => {
    const update = () =>
      setAtBottom(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - BOTTOM_THRESHOLD)
    // also check once after mount: the browser may restore a scroll position without firing a scroll event
    const frame = requestAnimationFrame(update)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  function scrollToTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={profile.nav.backToTopLabel}
      title={profile.nav.backToTopLabel}
      aria-hidden={!atBottom}
      tabIndex={atBottom ? 0 : -1}
      data-visible={atBottom}
      className="button-accent btn-square back-to-top"
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  )
}
