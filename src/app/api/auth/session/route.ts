import { NextRequest, NextResponse } from 'next/server'
import { CloudFunctionError } from '../../../../middleware/cloudFunctions.ts'
import { SESSION_COOKIE, createSession, sessionCookieOptions } from '../../../../middleware/sessionService.ts'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

/** Sign-in: swaps a fresh Firebase ID token for the httpOnly session cookie. */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json().catch(() => ({}))
    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ error: 'Sign-in required.' }, { status: 401, headers: NO_STORE })
    }
    const { cookie, maxAgeSeconds, email, role } = await createSession(idToken)
    const response = NextResponse.json({ email, role }, { headers: NO_STORE })
    response.cookies.set(SESSION_COOKIE, cookie, sessionCookieOptions(maxAgeSeconds))
    return response
  } catch (err) {
    if (err instanceof CloudFunctionError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE })
    }
    console.error('session create failed:', err)
    return NextResponse.json({ error: 'Request failed.' }, { status: 500, headers: NO_STORE })
  }
}

/** Sign-out: clears the session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: NO_STORE })
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 })
  return response
}
