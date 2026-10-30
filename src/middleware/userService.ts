// User registration and access management. The browser's Firebase ID token is forwarded to the
// Cloud Functions, which verify it; admin operations additionally require an admin role there.
import 'server-only'
import { callCloudFunction } from './cloudFunctions.ts'

export type UserRole = 'reader' | 'admin'
export type UserAction = 'add' | 'setRole' | 'revoke' | 'restore'

export interface AccessUser {
  email: string
  displayName: string
  role: UserRole
  allowed: boolean
  createdAt: string | null
  lastLoginAt: string | null
}

export interface RegisterResult {
  created: boolean
  role: UserRole
  allowed: boolean
}

export const registerUser = (idToken: string) =>
  callCloudFunction<RegisterResult>('registerUser', { idToken })

export const listUsers = (idToken: string) =>
  callCloudFunction<{ users: AccessUser[]; truncated: boolean }>('adminListUsers', { idToken })

export const setUser = (idToken: string, email: string, action: UserAction, role?: UserRole) =>
  callCloudFunction<{ success: boolean; email: string; action: UserAction }>('adminSetUser', {
    idToken,
    email,
    action,
    role,
  })
