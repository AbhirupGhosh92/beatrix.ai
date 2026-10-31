// Admin cleanup of resume and job application data left behind by revoked users. The browser's Firebase ID token is
// forwarded to the Cloud Functions, which require cms:write. Only metadata is ever returned: admins
// cannot read resume or application content.
import 'server-only'
import { callCloudFunction } from './cloudFunctions.ts'

export interface OrphanedOwner {
  email: string
  /** Resumes. */
  count: number
  applications: number
  bytes: number
  updatedAt: string | null
}

export const listOrphanedOwners = (idToken: string) =>
  callCloudFunction<{ owners: OrphanedOwner[]; truncated: boolean }>('adminListResumeOwners', { idToken })

export const purgeOwner = (idToken: string, email: string, confirmEmail: string) =>
  callCloudFunction<{ success: boolean; deletedObjects: number; deletedApplications: number }>('adminPurgeResumeOwner', {
    idToken,
    email,
    confirmEmail,
  })
