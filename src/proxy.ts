// The route gate. Default-deny: every path not listed as public in src/lib/access.ts needs a valid
// session, and some need more than that (e.g. /admin needs cms:write). The Cloud Functions and API
// routes check permissions again next to the data; this is the first line, not the only one.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { can, requiredPermission } from './lib/access.ts'
import { SESSION_COOKIE, verifySession } from './middleware/sessionService.ts'
import type { Session } from './middleware/sessionService.ts'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const needed = requiredPermission(pathname)
  if (!needed) return NextResponse.next()

  const isApi = pathname === '/api' || pathname.startsWith('/api/')
  const home = () => {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value
  let session: Session | null
  try {
    session = await verifySession(cookie)
  } catch (err) {
    // The session check is unreachable: fail closed, and keep the cookie for when it recovers.
    console.error('session check failed:', err)
    return isApi ? NextResponse.json({ error: 'Request failed.' }, { status: 503, headers: NO_STORE }) : home()
  }

  if (!session) {
    const response = isApi
      ? NextResponse.json({ error: 'Sign-in required.' }, { status: 401, headers: NO_STORE })
      : home()
    if (cookie) response.cookies.delete(SESSION_COOKIE)
    return response
  }

  if (!can(session.role, needed)) {
    return isApi ? NextResponse.json({ error: 'Not allowed.' }, { status: 403, headers: NO_STORE }) : home()
  }
  return NextResponse.next()
}
