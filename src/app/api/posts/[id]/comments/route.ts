import { NextRequest, NextResponse } from 'next/server'
import { addComment } from '../../../../../middleware/blogService.ts'
import { NO_STORE, failure, signedInGuard } from '../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

/** Any signed-in user: add a plain-text comment. The function validates and limits it. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const guard = await signedInGuard(request)
    if (guard instanceof NextResponse) return guard
    let body: unknown
    try {
      body = await request.json()
    } catch {
      body = null
    }
    const text = (body as { text?: unknown } | null)?.text
    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'Write a comment first.' }, { status: 400, headers: NO_STORE })
    }
    return NextResponse.json(await addComment(guard.cookie, (await params).id, text), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'blog comment add')
  }
}
