'use client'

import { Check } from 'lucide-react'
import type { ResumeTemplate } from '../../data/resumeConfig.ts'

interface Props {
  templates: ResumeTemplate[]
  selected: string
  onSelect: (templateId: string) => void
}

// The enabled templates from the resume config as a list of choices. Used in the quick-actions rail
// and the Design tab, so there is one place that knows how a template is offered.
export default function TemplateGallery({ templates, selected, onSelect }: Props) {
  if (templates.length === 0) return <p className="text-meta">No templates are available right now. Markdown download still works.</p>
  return (
    <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Template">
      {templates.map((template) => {
        const on = template.id === selected
        return (
          <li key={template.id}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              className={`w-full justify-between ${on ? 'button-primary' : 'button-secondary'}`}
              onClick={() => onSelect(template.id)}
            >
              <span>{template.label}</span>
              {on && <Check size={14} />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
