'use client'

import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { normalizeLabel } from '../../lib/applicationView.ts'

interface Props {
  labels: string[]
  /** The user's existing labels, offered as suggestions. */
  suggestions: string[]
  max: number
  maxLength: number
  onChange: (labels: string[]) => void
}

// Free-text labels as chips. Enter or a comma adds the typed text; "Remote" and "remote" are one label.
export default function LabelInput({ labels, suggestions, max, maxLength, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const listId = useId()
  const atMax = labels.length >= max

  function add(raw: string) {
    const label = normalizeLabel(raw)
    if (label && !labels.includes(label) && labels.length < max) onChange([...labels, label])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      {labels.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Labels">
          {labels.map((label) => (
            <li key={label}>
              <button
                type="button"
                className="button-accent btn-xs gap-1"
                aria-label={`Remove label ${label}`}
                onClick={() => onChange(labels.filter((l) => l !== label))}
              >
                {label} <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        className="input input-bordered w-full"
        value={draft}
        maxLength={maxLength}
        list={listId}
        disabled={atMax}
        placeholder={atMax ? `Up to ${max} labels` : 'Type a label and press Enter'}
        aria-label="Add a label"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => add(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            add(draft)
          }
        }}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !labels.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  )
}
