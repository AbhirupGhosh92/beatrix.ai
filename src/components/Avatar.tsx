import { useState } from 'react'
import { profile } from '../data/profile.ts'

/** Photo in a 3D-tilting card with an animated glowing aura; falls back to initials. */
export default function Avatar() {
  const [failed, setFailed] = useState(false)
  const { person } = profile

  return (
    <div className="aura text-primary [--aura-radius:var(--radius-box)]">
      <div className="hover-3d">
        <figure className="size-56 bg-base-200 sm:size-72">
          {failed ? (
            <div className="grid size-full place-content-center bg-base-300 font-display text-6xl text-brand sm:text-7xl">
              {person.initials}
            </div>
          ) : (
            <img
              src={person.avatar}
              alt={`${person.name}, ${person.title}`}
              className="size-full object-cover"
              onError={() => setFailed(true)}
            />
          )}
        </figure>
        {/* hover-3d needs 8 empty cells that track the pointer */}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} />
        ))}
      </div>
    </div>
  )
}
