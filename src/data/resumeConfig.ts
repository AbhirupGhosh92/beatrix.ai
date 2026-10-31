// Shape of the resume builder config (cms/resume-config.json), kept apart from the landing page
// profile. Keep resume-config.example.json in step: it supplies every key a stored file lacks.
import type { Structure, StructureRules } from '../lib/resumeValidation.ts'

/** The CMS file (under cms/ in Storage) that holds the resume builder config. */
export const RESUME_CONFIG_FILE = 'resume-config.json'

/** Layouts implemented in code; a template picks one by id. */
export const TEMPLATE_LAYOUTS = ['classic', 'sidebar'] as const
export type TemplateLayout = (typeof TEMPLATE_LAYOUTS)[number]

/** sans = Helvetica/Arial, serif = Times/Times New Roman, mono = Courier/Courier New. */
export const TEMPLATE_FONTS = ['sans', 'serif', 'mono'] as const
export type TemplateFont = (typeof TEMPLATE_FONTS)[number]

export const TEMPLATE_SPACINGS = ['compact', 'normal', 'relaxed'] as const
export type TemplateSpacing = (typeof TEMPLATE_SPACINGS)[number]

export interface TemplateStyle {
  font: TemplateFont
  /** Body text size in points. */
  baseSize: number
  /** Accent color as #rrggbb. */
  accent: string
  spacing: TemplateSpacing
}

export interface ResumeTemplate {
  id: string
  label: string
  enabled: boolean
  layout: TemplateLayout
  style: TemplateStyle
}

export interface TrackerStatus {
  /** Stored on each application; keep it stable and change only the label. */
  id: string
  label: string
}

/** Job tracker settings; they live in the resume config so the CMS lists one file. */
export interface TrackerConfig {
  statuses: TrackerStatus[]
  /** Applications a base user may hold; roles with features:advanced have no cap. */
  baseMaxApplications: number
  /** Safety limit on applications per owner for everyone else (not a product cap). */
  maxApplications: number
  maxNotesLength: number
  maxLabels: number
  maxLabelLength: number
  /** Largest tailor JSON (serialized) an application may hold. */
  maxTailorBytes: number
}

export interface ResumeConfig {
  limits: {
    /** Resumes a base user may hold; advanced users have no cap. */
    baseMaxResumes: number
  }
  structureRules: StructureRules
  /** The structure every base user fills in (the standard resume_structure). */
  defaultStructure: Structure
  templates: ResumeTemplate[]
  tracker: TrackerConfig
}
