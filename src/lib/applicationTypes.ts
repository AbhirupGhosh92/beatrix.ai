// Shapes shared by the application API routes and the job tracker UI.
import type { TrackerStatus } from '../data/resumeConfig.ts'
import type { ResumeData } from './resumeValidation.ts'

export interface Application {
  id: string
  company: string
  role: string
  /** Link to the direct job posting, or empty. */
  jobUrl: string
  /** A configured status id. */
  status: string
  /** YYYY-MM-DD */
  appliedAt: string
  notes: string
  /** Lowercase, de-duplicated. */
  labels: string[]
  /** Id of the linked tailored resume, or null. */
  resumeId: string | null
  createdAt: string
  updatedAt: string
}

/** What the list returns: the tailor JSON itself is only sent when one application is opened. */
export interface ApplicationSummary extends Application {
  hasTailor: boolean
}

export interface ApplicationDetail extends Application {
  tailor: ResumeData | null
}

export interface TrackerLimits {
  baseMaxApplications: number
  maxApplications: number
  maxNotesLength: number
  maxLabels: number
  maxLabelLength: number
  maxTailorBytes: number
}

export interface ApplicationList {
  applications: ApplicationSummary[]
  statuses: TrackerStatus[]
  limits: TrackerLimits
  /** Applications the caller may hold, or null when only the safety limit applies. */
  cap: number | null
}

/** The editable fields; on update only the fields present change and `tailor: null` removes it. */
export interface ApplicationInput {
  company?: string
  role?: string
  jobUrl?: string
  status?: string
  appliedAt?: string
  notes?: string
  labels?: string[]
  tailor?: unknown
}

export interface CreatedResume {
  resumeId: string
  /** false when the application already had a live linked resume. */
  created: boolean
}
