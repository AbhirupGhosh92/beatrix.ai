'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { ResumeTemplate } from '../../data/resumeConfig.ts'
import { FORMATS, type ExportFormat } from '../../lib/resume/export.ts'
import type { ResumeData, Structure } from '../../lib/resumeValidation.ts'
import TemplatePreview from './TemplatePreview.tsx'

interface Props {
  templates: ResumeTemplate[]
  /** The resume's structure, so the preview fits it. */
  structure: Structure
  /** The open resume's data, drawn live in the preview. */
  data: ResumeData
  /** False while any field is invalid or a required one is empty. */
  valid: boolean
  /** True while a file is being generated. */
  busy: boolean
  onGenerate: (templateId: string, format: ExportFormat) => void
}

// Picks one template and one format; generating is blocked until the resume is valid.
export default function ExportPanel({ templates, structure, data, valid, busy, onGenerate }: Props) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const noTemplates = templates.length === 0
  const template = templates.find((candidate) => candidate.id === templateId)

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-meta-strong font-semibold">Format</span>
        <select className="select select-bordered w-full" value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-meta-strong font-semibold">Template</span>
        <select
          className="select select-bordered w-full"
          value={templateId}
          disabled={format === 'md' || noTemplates}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          {templates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </select>
        {format === 'md' && <span className="text-meta">Markdown has no styling, so the template does not apply.</span>}
        {noTemplates && <span className="text-meta">No templates are available right now.</span>}
      </label>
      {template && format !== 'md' && <TemplatePreview key={template.id} template={template} structure={structure} data={data} />}
      <button
        type="button"
        className="button-primary"
        disabled={!valid || busy || (format !== 'md' && noTemplates)}
        onClick={() => onGenerate(templateId, format)}
      >
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} Generate
      </button>
      {!valid && <p className="text-meta">Fix the highlighted fields to enable Generate.</p>}
    </div>
  )
}
