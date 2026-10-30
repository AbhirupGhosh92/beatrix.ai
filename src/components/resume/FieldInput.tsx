'use client'

import { typeCap, type FieldDef, type FieldValue, type StructureRules } from '../../lib/resumeValidation.ts'

interface Props {
  id: string
  field: FieldDef
  value: FieldValue | undefined
  rules: StructureRules
  /** Shown under the field when set. */
  error: string | null
  onChange: (value: FieldValue) => void
  onBlur: () => void
}

const INPUT_TYPES = { text: 'text', email: 'email', url: 'url', phone: 'tel', month: 'month' } as const

// One field of the structure-driven form. The example text is a placeholder only, so nothing is
// filled in until the user types it.
export default function FieldInput({ id, field, value, rules, error, onChange, onBlur }: Props) {
  const max = Math.min(field.maxLength ?? Infinity, typeCap(field.type, rules))
  const errorId = `${id}-error`
  const shared = {
    id,
    placeholder: field.placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    onBlur,
  }

  let control
  if (field.type === 'bullets') {
    const lines = Array.isArray(value) ? value : []
    control = (
      <textarea
        {...shared}
        className="textarea textarea-bordered w-full"
        rows={4}
        value={lines.join('\n')}
        onChange={(event) => onChange(event.target.value.split('\n'))}
      />
    )
  } else if (field.type === 'textarea') {
    control = (
      <textarea
        {...shared}
        className="textarea textarea-bordered w-full"
        rows={5}
        maxLength={max}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  } else {
    control = (
      <input
        {...shared}
        type={INPUT_TYPES[field.type]}
        className="input input-bordered w-full"
        maxLength={field.type === 'month' ? undefined : max}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-meta-strong font-semibold">
        {field.label}
        {field.required && <span className="text-error" aria-hidden="true"> *</span>}
        {field.type === 'bullets' && <span className="text-muted font-normal"> (one per line)</span>}
      </label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}
