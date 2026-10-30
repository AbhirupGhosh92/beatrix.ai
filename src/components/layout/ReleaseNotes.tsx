'use client'

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
  if (!release) return null
  const lines = noteLines(release.notes)

  return (
    <div className="flex justify-center bg-neutral pb-6 text-neutral-content">
      <button
        type="button"
        className="btn-ghost btn-xs text-xs"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
      >
        {release.version}
      </button>
      <dialog ref={dialog} className="modal" aria-labelledby="release-notes-title">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn-square btn-ghost btn-sm absolute top-2 right-2" aria-label="Close">
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
