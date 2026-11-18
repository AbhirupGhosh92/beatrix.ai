// Shared plumbing for the API routes that forward a Firebase ID token to the Cloud Functions.
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { can, isFeatureEnabled, type Role } from '../lib/access.ts'
import { CloudFunctionError } from './cloudFunctions.ts'
import { getBlogConfig } from './blogConfigService.ts'
import { getProfile } from './profileService.ts'
import { SESSION_COOKIE, verifySession } from './sessionService.ts'

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

export function bearerToken(request: NextRequest): string | null {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
}

export function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401, headers: NO_STORE })
}

export function failure(err: unknown, label: string) {
  if (err instanceof CloudFunctionError) {
    return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE })
  }
  console.error(`${label} failed:`, err)
  return NextResponse.json({ error: 'Request failed.' }, { status: 500, headers: NO_STORE })
}

/**
 * Defence in depth next to src/proxy.ts: a route of a switchable feature answers 404 while its
 * menu item is not enabled, even if the proxy were bypassed. Null when the feature is on.
 */
export async function featureOff(itemId: string): Promise<NextResponse | null> {
  const { nav } = await getProfile()
  if (isFeatureEnabled(nav.drawerItems, itemId)) return null
  return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: NO_STORE })
}

export const sessionCookie = (request: NextRequest): string | null => request.cookies.get(SESSION_COOKIE)?.value ?? null

/**
 * Defence in depth for the blog routes next to src/proxy.ts: 404 while the blog is off, 403 when the
 * role may not write. Null when the request may go on.
 */
export async function blogOff(role: Role | null): Promise<NextResponse | null> {
  const config = await getBlogConfig()
  if (!config.enabled) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: NO_STORE })
  if (!can(role, 'blog:write', { blogWriteRoles: config.writeRoles })) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403, headers: NO_STORE })
  }
  return null
}

/** The checks every authenticated blog route starts with: cookie, session, blog on, role may write. */
export async function blogGuard(request: NextRequest): Promise<{ cookie: string; role: Role } | NextResponse> {
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  const session = await verifySession(cookie)
  if (!session) return unauthorized('Sign-in required.')
  const denied = await blogOff(session.role)
  return denied ?? { cookie, role: session.role }
}
