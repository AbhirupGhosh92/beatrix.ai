'use client'

import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { X } from 'lucide-react'
import type { LatestRelease } from '../../middleware/releaseService.ts'

// Release bodies are Markdown-ish lists; show them as plain text lines (never as HTML).
function noteLines(notes: string): string[] {
  return notes
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*+]|#{1,6})\s+/, '').trim())
    .filter(Boolean)
}

export default function ReleaseNotes({ release }: { release: LatestRelease | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()
  // The root layout renders this on every page; the version belongs on the home page only.
  if (!release || pathname !== '/') return null
  const lines = noteLines(release.notes)

  return (
    // Even py-4 spacing, start-aligned inside the same capped gutter as the page content; the
    // centered back-to-top button sits at the bottom center, clear of the start-aligned version.
    <div className="bg-neutral text-neutral-content">
      <div className="mx-auto flex w-full max-w-screen-2xl justify-start px-3 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="release-version"
          onClick={() => dialog.current?.showModal()}
          aria-haspopup="dialog"
        >
          {release.version}
        </button>
      </div>
      <dialog ref={dialog} className="modal" aria-labelledby="release-notes-title">
        <div className="modal-box text-base-content">
          <form method="dialog">
            <button className="release-close" aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          </form>
          <h2 id="release-notes-title" className="heading-display text-xl">
            What&apos;s new in {release.version}
          </h2>
          {lines.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mt-4">No release notes for this version.</p>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Close">close</button>
        </form>
      </dialog>
    </div>
  )
}
