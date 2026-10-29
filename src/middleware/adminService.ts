// Admin CMS operations. The browser's Firebase ID token is forwarded to the Cloud Functions, which
// verify it and check the allowed_emails `admin` flag; this layer adds nothing a client could use.
import 'server-only'
import { callCloudFunction } from './cloudFunctions.ts'

export interface CmsFile {
  filename: string
  displayName: string
  exists: boolean
  size: number
  updatedAt: string | null
}

export interface CmsFileContent extends CmsFile {
  content: string
}

export interface CmsSaveResult extends CmsFile {
  success: boolean
  message: string
}

export const listFiles = (idToken: string) =>
  callCloudFunction<{ files: CmsFile[] }>('adminListFiles', { idToken })

export const getFile = (idToken: string, file: string) =>
  callCloudFunction<CmsFileContent>('adminGetFile', { idToken, file })

export const saveFile = (idToken: string, file: string, content: string) =>
  callCloudFunction<CmsSaveResult>('adminSaveFile', { idToken, file, content })
