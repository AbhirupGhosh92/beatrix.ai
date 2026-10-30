'use client'

import { Plus, Trash2 } from 'lucide-react'
import { addEntry, fieldPath, removeEntry, setFieldValue } from '../../lib/resumeForm.ts'
import type { ResumeData, SectionData, Structure, StructureRules } from '../../lib/resumeValidation.ts'
import FieldInput from './FieldInput.tsx'

interface Props {
  structure: Structure
  data: ResumeData
  rules: StructureRules
  /** field path -> message, from validateForGenerate */
  errors: ReadonlyMap<string, string>
  /** Fields the user has left, so errors are not shown on a form they have not touched yet. */
  touched: ReadonlySet<string>
  /** Show every error (after the user tried to generate). */
  showAll: boolean
  onChange: (data: ResumeData) => void
  onTouch: (path: string) => void
}

export default function StructureForm({ structure, data, rules, errors, touched, showAll, onChange, onTouch }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {structure.sections.map((section) => {
        const current = data[section.id]
        const entries: SectionData[] = section.repeatable
          ? Array.isArray(current) ? current : []
          : [Array.isArray(current) || !current ? {} : current]

        return (
          <fieldset key={section.id} className="surface rounded-box flex flex-col gap-4 p-4 sm:p-5">
            <legend className="heading-display px-2 text-lg font-bold text-brand">{section.title}</legend>

            {entries.map((entry, index) => (
              <div key={index} className={section.repeatable ? 'flex flex-col gap-3 rounded-lg border border-base-300 p-3' : 'flex flex-col gap-3'}>
                {section.repeatable && (
                  <div className="flex items-center justify-between">
                    <span className="text-meta-strong font-semibold">
                      {section.title} #{index + 1}
                    </span>
                    <button
                      type="button"
                      className="btn-sm button-secondary"
                      onClick={() => onChange(removeEntry(data, section, index))}
                      aria-label={`Remove ${section.title} entry ${index + 1}`}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                )}
                {section.fields.map((field) => {
                  const path = fieldPath(section, index, field.id)
                  const shown = showAll || touched.has(path)
                  return (
                    <FieldInput
                      key={field.id}
                      id={`f-${path.replace(/\./g, '-')}`}
                      field={field}
                      rules={rules}
                      value={entry[field.id]}
                      error={shown ? (errors.get(path) ?? null) : null}
                      onChange={(value) => onChange(setFieldValue(data, section, index, field.id, value))}
                      onBlur={() => onTouch(path)}
                    />
                  )
                })}
              </div>
            ))}

            {section.repeatable && (
              <button
                type="button"
                className="btn-sm button-accent self-start"
                disabled={entries.length >= rules.maxEntries}
                onClick={() => onChange(addEntry(data, section))}
              >
                <Plus size={14} /> Add {section.title.toLowerCase()} entry
              </button>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}
