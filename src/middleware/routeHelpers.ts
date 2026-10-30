// Shared plumbing for the API routes that forward a Firebase ID token to the Cloud Functions.
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { CloudFunctionError } from './cloudFunctions.ts'

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
