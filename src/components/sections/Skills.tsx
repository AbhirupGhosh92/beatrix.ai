'use client'


import { Fragment, useCallback, useLayoutEffect, useRef } from 'react'
import { Wrench } from 'lucide-react'
import { profile } from '../data/profile.ts'
import Reveal from './Reveal.tsx'
import SectionHeading from './SectionHeading.tsx'

export default function Skills() {
  const { skills } = profile
  const tabsRef = useRef<HTMLDivElement>(null)

  // Position the highlight pill over the checked tab. Its left/top/width/height are CSS
  // variables that index.css transitions, so selecting a tab slides the pill to it.
  const movePill = useCallback(() => {
    const root = tabsRef.current
    const checked = root?.querySelector<HTMLInputElement>('input.tab:checked')
    if (!root || !checked) return
    root.style.setProperty('--pill-x', `${checked.offsetLeft}px`)
    root.style.setProperty('--pill-y', `${checked.offsetTop}px`)
    root.style.setProperty('--pill-w', `${checked.offsetWidth}px`)
    root.style.setProperty('--pill-h', `${checked.offsetHeight}px`)
  }, [])

  useLayoutEffect(() => {
    const root = tabsRef.current
    if (!root) return
    movePill()
    // enable the slide transition only after the first placement, so the pill doesn't fly in
    const frame = requestAnimationFrame(() => root.setAttribute('data-ready', 'true'))
    // tabs wrap and resize with the viewport and when web fonts finish loading
    const observer = new ResizeObserver(movePill)
    observer.observe(root)
    void document.fonts?.ready.then(movePill)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [movePill])

  return (
    <section>
      <SectionHeading id="skills" icon={<Wrench />} title={skills.title} kicker={skills.kicker} />
      <Reveal>
        <div ref={tabsRef} onChange={movePill} className="tabs-box tabs flex-wrap">
          <span className="tab-pill" aria-hidden="true" />
          {skills.groups.map((group, i) => (
            <Fragment key={group.group}>
              <input
                type="radio"
                name="skills"
                className="tab"
                aria-label={group.group}
                defaultChecked={i === 0}
              />
              <div className="tab-content p-4 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="badge badge-outline badge-lg hover-subtle"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
