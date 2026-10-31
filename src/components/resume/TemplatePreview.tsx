'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import type { ResumeTemplate } from '../../data/resumeConfig.ts'
import { buildDocument } from '../../lib/resume/model.ts'
import { withSampleFallback } from '../../lib/resume/sample.ts'
import type { ResumeData, Structure } from '../../lib/resumeValidation.ts'

/** Wait this long after the last edit before redrawing, so typing is not slowed by the renderer. */
const REDRAW_MS = 500

interface Props {
  template: ResumeTemplate
  structure: Structure
  /** The open resume's data, the same state the form edits and autosave stores. */
  data: ResumeData
}

// A preview of the chosen template filled with the open resume's own content, with sample text
// wherever a field is still empty. It is derived from `data` (no second copy), drawn by the real
// PDF renderer so it matches the download, and the PDF library loads here, when the preview
// appears, and not with the page. A redraw keeps the previous page on screen until the new one is
// ready, and a redraw that was overtaken by a newer edit is dropped.
export default function TemplatePreview({ template, structure, data }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [inline, setInline] = useState(true)
  const urlRef = useRef<string | null>(null)
  // Set when a draw starts (not when one succeeds), so a failed draw does not turn the debounce off.
  const attemptedRef = useRef(false)

  const shown = useMemo(() => withSampleFallback(structure, data), [structure, data])

  useEffect(() => {
    let ignore = false
    // The first drawing is immediate; later ones, even after a failed one, wait for the user to pause.
    const timer = setTimeout(
      async () => {
        attemptedRef.current = true
        try {
          const { toPdf } = await import('../../lib/resume/toPdf.ts')
          const blob = await toPdf(buildDocument('Resume', structure, shown), template)
          if (ignore) return
          const next = URL.createObjectURL(blob)
          const previous = urlRef.current
          urlRef.current = next
          setInline(navigator.pdfViewerEnabled !== false)
          setFailed(false)
          setUrl(next)
          if (previous) URL.revokeObjectURL(previous)
        } catch {
          if (!ignore) setFailed(true)
        }
      },
      attemptedRef.current ? REDRAW_MS : 0,
    )
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [template, structure, shown])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  return (
    <figure className="flex flex-col gap-2">
      <div className="aspect-[1/1.414] w-full overflow-hidden rounded-lg border border-base-300 bg-white">
        {failed && !url ? (
          <p className="p-4 text-meta">The preview could not be drawn. You can still generate the file.</p>
        ) : !url ? (
          <p className="flex h-full items-center justify-center gap-2 text-muted">
            <Loader2 className="animate-spin" size={16} /> Drawing preview...
          </p>
        ) : inline ? (
          <iframe
            title={`Preview of your resume in the ${template.label} template`}
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className="h-full w-full"
          />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center gap-2 p-4 text-brand">
            <ExternalLink size={16} /> Open preview
          </a>
        )}
      </div>
      <figcaption className="text-meta">
        Preview of your resume. Sample text is shown for the fields you have not filled in yet. Word files use the same style in one column.
      </figcaption>
    </figure>
  )
}
