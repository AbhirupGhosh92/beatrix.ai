// Server-side sessions. The browser holds only an httpOnly session cookie; creating and checking it
// (and reading the user's role) is done by the private sessionCreate / sessionVerify Cloud
// Functions, so firebase-admin never runs in the Next.js server. Nothing about the role is cached
// here: every verify re-reads it, so role changes and revocations apply to the next request.
import 'server-only'
import { CloudFunctionError, callCloudFunction } from './cloudFunctions.ts'
import type { Role } from '../lib/access.ts'

/** `__session` is the one cookie Firebase App Hosting's CDN forwards to the server. */
export const SESSION_COOKIE = '__session'

export interface Session {
  email: string
  role: Role
}

interface CreatedSession extends Session {
  cookie: string
  maxAgeSeconds: number
}

/** Exchanges a fresh Firebase ID token for a session cookie value (throws CloudFunctionError). */
export const createSession = (idToken: string) =>
  callCloudFunction<CreatedSession>('sessionCreate', { idToken })

/** Cookie attributes: not readable by page scripts, https-only outside local development. */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

/**
 * The session behind a cookie value, or null when there is none or it is invalid, expired, revoked
 * or its account lost access. Any other failure (functions unreachable) throws so callers deny.
 */
export async function verifySession(cookie: string | null | undefined): Promise<Session | null> {
  if (!cookie) return null
  try {
    return await callCloudFunction<Session>('sessionVerify', { cookie })
  } catch (err) {
    if (err instanceof CloudFunctionError && err.status === 401) return null
    throw err
  }
}
