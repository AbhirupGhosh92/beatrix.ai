'use client'

import { useCallback, useState } from 'react'
import { aiApi, type SkillMatchResult, type TailorResult } from '../lib/aiClient.ts'
import type { ResumeData } from '../lib/resumeValidation.ts'

type Busy = 'skill' | 'tailor' | null

/** The AI panel's state: the job description and the latest Skill Match and Tailor results. */
export function useAiActions() {
  const [jobDescription, setJobDescription] = useState('')
  const [skill, setSkill] = useState<SkillMatchResult | null>(null)
  const [tailor, setTailor] = useState<TailorResult | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async <R,>(which: Exclude<Busy, null>, call: () => Promise<R>, store: (result: R) => void) => {
    setBusy(which)
    setError(null)
    try {
      store(await call())
    } catch (err) {
      // The workspace keeps working; the message only says the AI part did not.
      setError(err instanceof Error ? err.message : 'The AI service is unavailable.')
    } finally {
      setBusy(null)
    }
  }, [])

  const runSkillMatch = useCallback((data: ResumeData) => run('skill', () => aiApi.skillMatch(data, jobDescription), setSkill), [run, jobDescription])
  const runTailor = useCallback((data: ResumeData) => run('tailor', () => aiApi.tailor(data, jobDescription), setTailor), [run, jobDescription])

  return { jobDescription, setJobDescription, skill, tailor, clearTailor: () => setTailor(null), busy, error, runSkillMatch, runTailor }
}
