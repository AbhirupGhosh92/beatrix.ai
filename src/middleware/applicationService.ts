// Job applications. The browser's session cookie is forwarded to the Cloud Functions, which verify
// it and derive the owner themselves; this layer adds the tracker limits and the resume config's
// cap and rules (the tailored resume is a resume).
import 'server-only'
import type {
  ApplicationDetail,
  ApplicationInput,
  ApplicationList,
  ApplicationSummary,
  CreatedResume,
} from '../lib/applicationTypes.ts'
import { callCloudFunction } from './cloudFunctions.ts'
import { getResumeConfig } from './resumeConfigService.ts'

async function config() {
  const c = await getResumeConfig()
  return {
    baseMaxResumes: c.limits.baseMaxResumes,
    rules: c.structureRules,
    defaultStructure: c.defaultStructure,
    tracker: c.tracker,
  }
}

export const listApplications = async (cookie: string) =>
  callCloudFunction<ApplicationList>('applicationList', { cookie, config: await config() })

export const getApplication = async (cookie: string, id: string) =>
  callCloudFunction<{ application: ApplicationDetail }>('applicationGet', { cookie, id, config: await config() })

export const createApplication = async (cookie: string, input: ApplicationInput) =>
  callCloudFunction<{ application: ApplicationSummary }>('applicationCreate', { cookie, ...input, config: await config() })

export const updateApplication = async (cookie: string, id: string, input: ApplicationInput) =>
  callCloudFunction<{ application: ApplicationSummary }>('applicationUpdate', { cookie, ...input, id, config: await config() })

export const deleteApplication = async (cookie: string, id: string) =>
  callCloudFunction<{ success: boolean }>('applicationDelete', { cookie, id, config: await config() })

export const createApplicationResume = async (cookie: string, id: string) =>
  callCloudFunction<CreatedResume>('applicationCreateResume', { cookie, id, config: await config() })
