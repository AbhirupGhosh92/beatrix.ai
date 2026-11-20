import { NextRequest, NextResponse } from 'next/server'
import { getBlogConfig } from '../../../../../middleware/blogConfigService.ts'
import { getEngagement } from '../../../../../middleware/blogService.ts'
import { NO_STORE, failure, sessionCookie } from '../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

/**
 * Public: counts and comments of a published post. The cookie is optional; the function treats a
 * missing or invalid one as anonymous. 404 while the blog is off and for any post that is not published.
 */
export async function GET(request: NextRequest, { params }: Context) {
  try {
    if (!(await getBlogConfig()).enabled) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: NO_STORE })
    }
    const before = request.nextUrl.searchParams.get('before')
    return NextResponse.json(
      await getEngagement(sessionCookie(request), (await params).id, before && before.length <= 64 ? before : undefined),
      { headers: NO_STORE },
    )
  } catch (err) {
    return failure(err, 'blog engagement read')
  }
}
