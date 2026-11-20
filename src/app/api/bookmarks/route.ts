import { NextRequest, NextResponse } from 'next/server'
import { listBookmarks } from '../../../middleware/blogService.ts'
import { NO_STORE, failure, signedInGuard } from '../../../middleware/routeHelpers.ts'

/** Any signed-in user: their own bookmarked posts, newest saved first. */
export async function GET(request: NextRequest) {
  try {
    const guard = await signedInGuard(request)
    if (guard instanceof NextResponse) return guard
    return NextResponse.json(await listBookmarks(guard.cookie), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'blog bookmarks')
  }
}
