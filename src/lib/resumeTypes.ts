// Shapes shared by the resume API routes and the builder UI.
import type { ResumeTemplate } from '../data/resumeConfig.ts'
import type { ResumeData, Structure, StructureRules } from './resumeValidation.ts'

export interface ResumeSummary {
  id: string
  title: string
  updatedAt: string | null
  size: number
}

export interface Resume {
  id: string
  title: string
  /** null = the current default structure (base users); advanced users keep their own. */
  structure: Structure | null
  data: ResumeData
  createdAt: string
  updatedAt: string
}

/** A resume plus the stored version the next save must quote. */
export interface ResumeEnvelope {
  resume: Resume
  generation: string
}

/** What the builder page needs to know about the caller and the feature. */
export interface BuilderConfig {
  /** Resumes the caller may hold, or null for no cap. */
  cap: number | null
  canCustomize: boolean
  structureRules: StructureRules
  defaultStructure: Structure
  /** Enabled templates only. */
  templates: ResumeTemplate[]
}
