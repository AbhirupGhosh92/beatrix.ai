// Shared plumbing for the API routes that forward a Firebase ID token to the Cloud Functions.
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { isFeatureEnabled } from '../lib/access.ts'
import { CloudFunctionError } from './cloudFunctions.ts'
import { getProfile } from './profileService.ts'
import { SESSION_COOKIE } from './sessionService.ts'

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
