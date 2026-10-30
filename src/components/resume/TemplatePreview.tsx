'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import type { ResumeTemplate } from '../../data/resumeConfig.ts'
import { buildDocument } from '../../lib/resume/model.ts'
import { sampleData } from '../../lib/resume/sample.ts'
import type { Structure } from '../../lib/resumeValidation.ts'

interface Props {
  template: ResumeTemplate
  structure: Structure
}

// A preview of the chosen template filled with sample data (never the user's resume). It is the
// real PDF renderer's output, so it matches the download exactly; the PDF library loads here, when
// the preview appears, and not with the page.
export default function TemplatePreview({ template, structure }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [inline, setInline] = useState(true)

  useEffect(() => {
    let ignore = false
    let objectUrl: string | undefined
    ;(async () => {
      try {
        const { toPdf } = await import('../../lib/resume/toPdf.ts')
        const blob = await toPdf(buildDocument('Sample resume', structure, sampleData(structure)), template)
        if (ignore) return
        objectUrl = URL.createObjectURL(blob)
        setInline(navigator.pdfViewerEnabled !== false)
        setUrl(objectUrl)
      } catch {
        if (!ignore) setFailed(true)
      }
    })()
    return () => {
      ignore = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [template, structure])

  return (
    <figure className="flex flex-col gap-2">
      <div className="aspect-[1/1.414] w-full overflow-hidden rounded-lg border border-base-300 bg-white">
        {failed ? (
          <p className="p-4 text-meta">The preview could not be drawn. You can still generate the file.</p>
        ) : !url ? (
          <p className="flex h-full items-center justify-center gap-2 text-muted">
            <Loader2 className="animate-spin" size={16} /> Drawing preview...
          </p>
        ) : inline ? (
          <iframe
            title={`Preview of the ${template.label} template with sample data`}
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className="h-full w-full"
          />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center gap-2 p-4 text-brand">
            <ExternalLink size={16} /> Open preview
          </a>
        )}
      </div>
      <figcaption className="text-meta">Preview with sample data. Word files use the same style in one column.</figcaption>
    </figure>
  )
}
