'use client'

import { useState } from 'react'
import { useSkillMatchMutation, useTailorResumeMutation } from '../store/api.ts'
import type { SkillMatchResult, TailorResult } from '../store/api.ts'
import type { ResumeData } from '../lib/resumeValidation.ts'

type Busy = 'skill' | 'tailor' | null

/**
 * The AI panel's state: the job description being typed and the latest Skill Match and Tailor results,
 * which are the store's mutation results. Failures raise an error snackbar from the store; the workspace
 * keeps working either way.
 */
export function useAiActions() {
  const [jobDescription, setJobDescription] = useState('')
  const [runSkill, skillState] = useSkillMatchMutation()
  const [runTailorMutation, tailorState] = useTailorResumeMutation()

  const skill: SkillMatchResult | null = skillState.data ?? null
  const tailor: TailorResult | null = tailorState.data ?? null
  const busy: Busy = skillState.isLoading ? 'skill' : tailorState.isLoading ? 'tailor' : null

  const runSkillMatch = async (data: ResumeData) => {
    await runSkill({ data, jobDescription })
  }
  const runTailor = async (data: ResumeData) => {
    await runTailorMutation({ data, jobDescription })
  }

  return { jobDescription, setJobDescription, skill, tailor, clearTailor: tailorState.reset, busy, runSkillMatch, runTailor }
}
