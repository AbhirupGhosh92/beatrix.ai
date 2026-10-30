import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '../../../../middleware/sessionService.ts'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

/** The signed-in user's current role, read fresh from the allow list; 401 when anonymous. */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
    if (!session) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401, headers: NO_STORE })
    return NextResponse.json({ email: session.email, role: session.role }, { headers: NO_STORE })
  } catch (err) {
    console.error('session lookup failed:', err)
    return NextResponse.json({ error: 'Request failed.' }, { status: 503, headers: NO_STORE })
  }
}
