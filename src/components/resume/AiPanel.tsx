'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Target } from 'lucide-react'
import type { useAiActions } from '../../hooks/useAiActions.ts'
import { applicationApi } from '../../lib/applicationClient.ts'
import type { ApplicationSummary } from '../../lib/applicationTypes.ts'
import { reconcileData } from '../../lib/resumeForm.ts'
import type { ResumeData, Structure } from '../../lib/resumeValidation.ts'

interface Props {
  ai: ReturnType<typeof useAiActions>
  structure: Structure
  data: ResumeData
  /** The current Resume Score, shown so the AI tab and the rail agree. */
  score: number
  /** Replaces the open resume's content with the applied suggestion. */
  onApply: (data: ResumeData) => void
}

const PLACEHOLDER_NOTE = 'Placeholder result: the AI service is not connected to a model yet.'

// Skill Match and Tailor for Job. A tailored suggestion changes nothing until the user applies it,
// and applying is an ordinary edit that the role's save mode stores.
export default function AiPanel({ ai, structure, data, score, onApply }: Props) {
  const [apps, setApps] = useState<ApplicationSummary[] | null>(null)
  const [appsError, setAppsError] = useState<string | null>(null)
  const empty = ai.jobDescription.trim() === ''

  async function loadApplications() {
    setAppsError(null)
    try {
      setApps((await applicationApi.list()).applications)
    } catch {
      setAppsError('Your job applications are not available.')
    }
  }

  function fillFromApplication(id: string) {
    const app = apps?.find((candidate) => candidate.id === id)
    if (!app) return
    ai.setJobDescription(
      [`${app.role} at ${app.company}`, app.notes, app.jobUrl]
        .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
        .join('\n\n'),
    )
  }

  const suggestion = ai.tailor ? reconcileData(structure, ai.tailor.data) : null
  const changed = suggestion
    ? structure.sections.filter((section) => JSON.stringify(suggestion[section.id]) !== JSON.stringify(data[section.id]))
    : []

  return (
    <div className="flex flex-col gap-4">
      <p className="text-meta-strong font-semibold">Resume score: {score} / 100</p>
      <label className="flex flex-col gap-1">
        <span className="text-meta-strong font-semibold">Job description</span>
        <textarea
          className="textarea textarea-bordered min-h-40 w-full"
          maxLength={20000}
          placeholder="Paste the job posting here."
          value={ai.jobDescription}
          onChange={(event) => ai.setJobDescription(event.target.value)}
        />
      </label>

      {apps === null ? (
        <button type="button" className="btn-sm button-secondary self-start" onClick={() => void loadApplications()}>
          Use a tracked application
        </button>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-meta">Fills the job description from the role, notes and link of an application.</span>
          <select className="select select-bordered select-sm w-full" defaultValue="" onChange={(event) => fillFromApplication(event.target.value)}>
            <option value="" disabled>{apps.length === 0 ? 'No applications yet' : 'Choose an application'}</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>{app.company} - {app.role}</option>
            ))}
          </select>
        </label>
      )}
      {appsError && <p role="alert" className="text-meta text-error">{appsError}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="button-primary" disabled={empty || ai.busy !== null} onClick={() => void ai.runSkillMatch(data)}>
          {ai.busy === 'skill' ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />} Skill match
        </button>
        <button type="button" className="button-accent" disabled={empty || ai.busy !== null} onClick={() => void ai.runTailor(data)}>
          {ai.busy === 'tailor' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Tailor for job
        </button>
      </div>
      {empty && <p className="text-meta">Add a job description to enable these.</p>}
      {ai.error && <p role="alert" className="text-error">{ai.error} The rest of the editor keeps working.</p>}

      {ai.skill && (
        <section className="surface rounded-box flex flex-col gap-2 p-3" aria-label="Skill match result">
          <h3 className="text-meta-strong font-semibold">Skill match: {ai.skill.matchPercent}%</h3>
          {ai.skill.stub && <p className="text-meta">{PLACEHOLDER_NOTE}</p>}
          <p className="text-meta">Matched: {ai.skill.matched.length > 0 ? ai.skill.matched.join(', ') : 'none'}</p>
          <p className="text-meta">Missing: {ai.skill.missing.length > 0 ? ai.skill.missing.join(', ') : 'none'}</p>
        </section>
      )}

      {ai.tailor && suggestion && (
        <section className="surface rounded-box flex flex-col gap-2 p-3" aria-label="Tailored suggestion">
          <h3 className="text-meta-strong font-semibold">Tailored suggestion</h3>
          {ai.tailor.stub && <p className="text-meta">{PLACEHOLDER_NOTE}</p>}
          <p className="text-meta">
            {changed.length === 0 ? 'No changes to your resume.' : `Would change: ${changed.map((section) => section.title).join(', ')}.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-sm button-primary"
              disabled={changed.length === 0}
              onClick={() => {
                onApply(suggestion)
                ai.clearTailor()
              }}
            >
              Apply suggestion
            </button>
            <button type="button" className="btn-sm button-secondary" onClick={ai.clearTailor}>Dismiss</button>
          </div>
        </section>
      )}
    </div>
  )
}
