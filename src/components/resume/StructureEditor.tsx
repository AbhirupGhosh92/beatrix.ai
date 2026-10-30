'use client'

import { useState } from 'react'
import { validateStructure, type Structure, type StructureRules } from '../../lib/resumeValidation.ts'

interface Props {
  structure: Structure
  rules: StructureRules
  /** Called with a structure that passed validation. */
  onApply: (structure: Structure) => void
}

// Advanced users edit the structure file of a resume as JSON. It is checked against the rules from
// the resume config here and again by the server before it is stored.
export default function StructureEditor({ structure, rules, onApply }: Props) {
  const [text, setText] = useState(() => JSON.stringify(structure, null, 2))
  const [errors, setErrors] = useState<string[]>([])

  function apply() {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setErrors(['This is not valid JSON.'])
      return
    }
    const problems = validateStructure(parsed, rules)
    setErrors(problems)
    if (problems.length === 0) onApply(parsed as Structure)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-meta">
        Sections, fields and types of this resume. Field types: {rules.fieldTypes.join(', ')}. Up to {rules.maxSections} sections
        and {rules.maxFieldsPerSection} fields each. Values you already entered are kept for fields that stay.
      </p>
      <textarea
        aria-label="Resume structure (JSON)"
        className="textarea textarea-bordered w-full font-mono text-sm"
        rows={16}
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {errors.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-sm text-error">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button-primary" onClick={apply}>
          Apply structure
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            setText(JSON.stringify(structure, null, 2))
            setErrors([])
          }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
