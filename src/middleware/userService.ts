// User access management. The browser's Firebase ID token is forwarded to the Cloud Functions,
// which verify it and require the cms:write permission (first-sign-in registration happens inside
// the sessionCreate function, not here).
import 'server-only'
import type { Role } from '../lib/access.ts'
import { callCloudFunction } from './cloudFunctions.ts'

export type UserAction = 'add' | 'setRole' | 'revoke' | 'restore'

export interface AccessUser {
  email: string
  displayName: string
  role: Role
  allowed: boolean
  createdAt: string | null
  lastLoginAt: string | null
}

export const listUsers = (idToken: string) =>
  callCloudFunction<{ users: AccessUser[]; truncated: boolean }>('adminListUsers', { idToken })

export const setUser = (idToken: string, email: string, action: UserAction, role?: Role) =>
  callCloudFunction<{ success: boolean; email: string; action: UserAction }>('adminSetUser', {
    idToken,
    email,
    action,
    role,
  })
