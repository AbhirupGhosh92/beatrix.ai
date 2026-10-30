// User resumes. The browser's session cookie is forwarded to the Cloud Functions, which verify it
// and derive the owner themselves; this layer adds the resume config's limits and rules.
import 'server-only'
import type { ResumeData, Structure } from '../lib/resumeValidation.ts'
import type { Resume, ResumeEnvelope, ResumeSummary } from '../lib/resumeTypes.ts'
import { callCloudFunction } from './cloudFunctions.ts'
import { getResumeConfig } from './resumeConfigService.ts'

async function limits() {
  const config = await getResumeConfig()
  return {
    baseMaxResumes: config.limits.baseMaxResumes,
    rules: config.structureRules,
    defaultStructure: config.defaultStructure,
  }
}

export const listResumes = async (cookie: string) =>
  callCloudFunction<{ resumes: ResumeSummary[]; cap: number | null }>('resumeList', { cookie, config: await limits() })

export const getResume = (cookie: string, id: string) =>
  callCloudFunction<ResumeEnvelope>('resumeGet', { cookie, id })

export const createResume = async (cookie: string, input: { title: unknown; structure?: unknown; data?: unknown }) =>
  callCloudFunction<ResumeEnvelope>('resumeCreate', { cookie, ...input, config: await limits() })

export const saveResume = async (
  cookie: string,
  id: string,
  input: { title?: unknown; data: unknown; structure?: unknown; generation: unknown },
) => callCloudFunction<ResumeEnvelope>('resumeSave', { cookie, id, ...input, config: await limits() })

export const deleteResume = (cookie: string, id: string) =>
  callCloudFunction<{ success: boolean }>('resumeDelete', { cookie, id })

export type { Resume, ResumeData, Structure }
