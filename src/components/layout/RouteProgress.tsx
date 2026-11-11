'use client'

import { Suspense, useEffect, useRef } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { usePathname, useSearchParams } from 'next/navigation'
import { finishNavigation, startNavigation } from '../../lib/navigationProgress.ts'
import { PROGRESS_BAR_CLASS, useNavigating, useSafeReducedMotion } from '../ui/motion.tsx'

/** Nothing is drawn for navigations that finish within this time. */
const SHOW_DELAY_MS = 120

/** True when a click on this anchor would leave the current page through the app router. */
function isPageNavigation(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  const anchor = (event.target as Element | null)?.closest?.('a')
  if (!anchor || !anchor.href || anchor.hasAttribute('download')) return false
  if (anchor.target && anchor.target !== '_self') return false
  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return false
  return url.pathname !== window.location.pathname || url.search !== window.location.search
}

/** Starts the loader on link clicks and back/forward; ends it in LoaderBar. */
function NavigationWatcher() {
  const path = usePathname()
  const search = useSearchParams().toString()
  // Path and query the page is showing now, so a hash-only back/forward is not a navigation.
  const shown = useRef('')

  // The destination is shown: the path or the query string changed.
  useEffect(() => {
    shown.current = window.location.pathname + window.location.search
    finishNavigation()
  }, [path, search])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isPageNavigation(event)) startNavigation()
    }
    const onPopState = () => {
      if (window.location.pathname + window.location.search !== shown.current) startNavigation()
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  return null
}

/** The bar itself: trickles toward 85% while navigating, then completes and fades out. */
function LoaderBar() {
  const navigating = useNavigating()
  const scaleX = useMotionValue(0)
  const opacity = useMotionValue(0)

  useEffect(() => {
    if (navigating) {
      const show = setTimeout(() => {
        scaleX.set(0)
        opacity.set(1)
        animate(scaleX, 0.85, { duration: 8, ease: [0.1, 0.6, 0.3, 1] })
      }, SHOW_DELAY_MS)
      return () => clearTimeout(show)
    }
    // Finished (or never shown): complete the bar if it is visible, then fade and reset.
    if (opacity.get() === 0) return
    const done = animate(scaleX, 1, { duration: 0.2, ease: [0.2, 0, 0, 1] })
    const fade = animate(opacity, 0, { duration: 0.3, delay: 0.2 })
    fade.then(() => scaleX.set(0))
    return () => {
      done.stop()
      fade.stop()
    }
  }, [navigating, scaleX, opacity])

  return <motion.div aria-hidden="true" style={{ scaleX, opacity }} className={PROGRESS_BAR_CLASS} />
}

/** Global route-transition loader: mount once in the root layout. */
export default function RouteProgress() {
  const reduce = useSafeReducedMotion()
  if (reduce) return null
  return (
    <>
      <Suspense fallback={null}>
        <NavigationWatcher />
      </Suspense>
      <LoaderBar />
    </>
  )
}
