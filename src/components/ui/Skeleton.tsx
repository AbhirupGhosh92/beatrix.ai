// Loading placeholders shaped like the content they stand in for (api-feedback spec: skeletons, not spinners).

/** One or more text lines. */
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}

/** A table-like list: `rows` bars of row height. */
export function SkeletonRows({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  )
}

/** A full-page placeholder: a heading bar plus a block of rows. Announces itself politely. */
export function SkeletonPage({ rows = 6, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <div className="skeleton h-8 w-1/3" aria-hidden="true" />
      <SkeletonRows rows={rows} />
    </div>
  )
}

/** The inline error state with a Retry action (api-feedback spec). */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="alert alert-error">
      <span className="min-w-0 break-words">{message}</span>
      <button type="button" className="button-secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
