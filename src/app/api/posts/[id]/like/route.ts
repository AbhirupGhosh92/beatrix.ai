import { NextRequest, NextResponse } from 'next/server'
import { toggleLike } from '../../../../../middleware/blogService.ts'
import { NO_STORE, failure, signedInGuard } from '../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

/** Any signed-in user: like the post, or take the like back. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const guard = await signedInGuard(request)
    if (guard instanceof NextResponse) return guard
    return NextResponse.json(await toggleLike(guard.cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'blog like')
  }
}
