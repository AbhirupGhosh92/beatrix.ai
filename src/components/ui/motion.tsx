'use client'

import type { ReactNode, Ref } from 'react'
import { useRef, useSyncExternalStore } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'
import {
  getNavigating,
  getServerNavigating,
  subscribeNavigation,
} from '../../lib/navigationProgress.ts'

const noopSubscribe = () => () => {}

/**
 * The reduced-motion preference, read only after hydration. `useReducedMotion` can differ
 * between the server render and the first client render, which would be a hydration mismatch.
 */
function useSafeReducedMotion() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const reduce = useReducedMotion()
  return mounted ? Boolean(reduce) : false
}

/** Shared easing, matching --ease-standard in tokens/motion.css. */
const EASE = [0.2, 0, 0, 1] as const

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
}

/** Fades, rises and scales its children into place once when scrolled into view. */
export function Reveal({
  children,
  delay = 10,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useSafeReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: itemVariants.hidden,
        show: {
          ...(itemVariants.show as object),
          transition: { duration: 0.6, ease: EASE, delay: delay / 1000 },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/** Container whose StaggerItem children appear one after another when scrolled into view. */
export function Stagger({
  children,
  className = '',
  gap = 0.1,
  ref,
}: {
  children: ReactNode
  className?: string
  gap?: number
  ref?: Ref<HTMLDivElement>
}) {
  const reduce = useSafeReducedMotion()
  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useSafeReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  )
}

/** Shifts its children vertically in proportion to how far the element has scrolled through the viewport. */
export function Parallax({
  children,
  className = '',
  distance = 40,
}: {
  children: ReactNode
  className?: string
  /** Pixels moved over the element's trip through the viewport (+/- half of this each way). */
  distance?: number
}) {
  const reduce = useSafeReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance])

  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  )
}

/** Hero-style wrapper: fades, shrinks and lifts as the page scrolls away from it, reversing on the way back. */
export function ScrollFade({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useSafeReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.15])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94])
  const y = useTransform(scrollYProgress, [0, 1], [0, 60])

  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div ref={ref} style={{ opacity, scale, y }} className={className}>
      {children}
    </motion.div>
  )
}

/** Classes of the thin top bar, shared by the scroll progress and the navigation loader. */
export const PROGRESS_BAR_CLASS = 'fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary'

/** True while a page navigation is in progress (see RouteProgress). */
export function useNavigating() {
  return useSyncExternalStore(subscribeNavigation, getNavigating, getServerNavigating)
}

/**
 * Thin bar fixed to the top of the viewport showing how much of the page has been scrolled.
 * Hidden while navigating so the navigation loader is the only bar on screen.
 */
export function ScrollProgress() {
  const reduce = useSafeReducedMotion()
  const navigating = useNavigating()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 })

  if (reduce || navigating) return null
  return <motion.div aria-hidden="true" style={{ scaleX }} className={PROGRESS_BAR_CLASS} />
}

/** Reduced-motion preference for sibling components, safe against hydration mismatch. */
export { useSafeReducedMotion }
