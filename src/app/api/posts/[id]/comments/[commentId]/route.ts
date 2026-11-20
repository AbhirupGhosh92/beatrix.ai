import { NextRequest, NextResponse } from 'next/server'
import { removeComment } from '../../../../../../middleware/blogService.ts'
import { NO_STORE, failure, signedInGuard } from '../../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string; commentId: string }> }

/** The comment's writer, the post's author or the admin; the function decides and answers 403 otherwise. */
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const guard = await signedInGuard(request)
    if (guard instanceof NextResponse) return guard
    const { id, commentId } = await params
    return NextResponse.json(await removeComment(guard.cookie, id, commentId), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'blog comment remove')
  }
}
