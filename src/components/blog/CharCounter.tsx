interface Props {
  count: number
  max: number
  /** Unit after the numbers, `characters` by default. */
  unit?: string
  /** Names the counted text for assistive technology, e.g. "Title". */
  label: string
}

/** `n / max characters`, announced politely; warns from 90 % and turns to an error over the limit. */
export default function CharCounter({ count, max, unit = 'characters', label }: Props) {
  const state = count > max ? 'over' : count >= max * 0.9 ? 'near' : 'ok'
  return (
    <span className="char-counter" data-state={state} aria-live="polite" aria-atomic="true">
      <span className="sr-only">{label}: </span>
      {count} / {max} {unit}
      {state === 'over' && <span> (over the limit)</span>}
    </span>
  )
}
