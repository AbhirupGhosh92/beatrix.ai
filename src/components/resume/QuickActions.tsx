'use client'

import { Gauge } from 'lucide-react'
import type { ScoreResult } from '../../lib/resume/score.ts'

interface Props {
  score: ScoreResult
}

// The rail beside the canvas: the score and what costs points. Skill match and tailor live in the AI tab.
export default function QuickActions({ score }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="heading-display text-lg font-bold text-brand">Quick actions</h2>

      <section className="surface rounded-box flex flex-col gap-2 p-3" aria-label="Resume score">
        <div className="flex items-center gap-3">
          <div
            className="radial-progress text-brand"
            style={{ '--value': score.score, '--size': '4rem', '--thickness': '0.4rem' } as React.CSSProperties}
            role="img"
            aria-label={`Resume score ${score.score} out of 100`}
          >
            {score.score}
          </div>
          <span className="text-meta-strong font-semibold"><Gauge size={14} className="mr-1 inline" />Resume score</span>
        </div>
        {score.reasons.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-muted">
            {score.reasons.slice(0, 4).map((reason) => (
              <li key={reason.message}>{reason.message}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
