'use client'


import { useEffect, useState } from 'react'
import { useProfile } from '../layout/ProfileProvider.tsx'
import { useInView } from '../../hooks/useInView.ts'

/**
 * Counts from 0 up to `to` once `active`. The final value is also rendered invisibly so the
 * element keeps its full width while counting (no layout shift, no clipped digits).
 * (daisyUI's countdown was dropped: it clips glyphs in fonts whose digit widths differ.)
 */
function CountUp({ to, active }: { to: number; active: boolean }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!active) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduce ? 0 : 1600
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration)
      setN(Math.round(to * (1 - Math.pow(1 - t, 3)))) // ease-out
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, to])

  return (
    <span className="relative inline-block tabular-nums">
      <span className="sr-only">{to}</span>
      <span className="invisible" aria-hidden="true">
        {to}
      </span>
      <span className="absolute top-0 left-0" aria-hidden="true">
        {n}
      </span>
    </span>
  )
}

/** Impact numbers: daisyUI stats whose values count up when scrolled into view. */
export default function Stats() {
  const profile = useProfile()
  const [ref, inView] = useInView<HTMLDivElement>(0.3)

  return (
    <div ref={ref} className="stats stats-vertical surface w-full lg:stats-horizontal">
      {profile.stats.map((s) => (
        <div className="stat" key={`${s.label}-${s.value}`}>
          <div className="stat-title">{s.label}</div>
          <div className="stat-value font-display text-brand">
            {s.prefix}
            <CountUp to={s.value} active={inView} />
            {s.suffix}
          </div>
          <div className="stat-desc whitespace-normal">{s.desc}</div>
        </div>
      ))}
    </div>
  )
}
