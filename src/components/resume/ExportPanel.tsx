'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import type { ResumeTemplate } from '../../data/resumeConfig.ts'

export const FORMATS = [
  { id: 'pdf', label: 'PDF' },
  { id: 'docx', label: 'Word (DOCX)' },
  { id: 'md', label: 'Markdown' },
] as const
export type ExportFormat = (typeof FORMATS)[number]['id']

interface Props {
  templates: ResumeTemplate[]
  /** False while any field is invalid or a required one is empty. */
  valid: boolean
  onGenerate: (templateId: string, format: ExportFormat) => void
}

// Picks one template and one format; generating is blocked until the resume is valid.
export default function ExportPanel({ templates, valid, onGenerate }: Props) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const noTemplates = templates.length === 0

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-meta-strong font-semibold">Template</span>
        <select
          className="select select-bordered w-full"
          value={templateId}
          disabled={format === 'md' || noTemplates}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
        {format === 'md' && <span className="text-meta">Markdown has no styling, so the template does not apply.</span>}
        {noTemplates && <span className="text-meta">No templates are available right now.</span>}
      </label>
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
      <button
        type="button"
        className="button-primary"
        disabled={!valid || (format !== 'md' && noTemplates)}
        onClick={() => onGenerate(templateId, format)}
      >
        <Download size={16} /> Generate
      </button>
      {!valid && <p className="text-meta">Fix the highlighted fields to enable Generate.</p>}
    </div>
  )
}
