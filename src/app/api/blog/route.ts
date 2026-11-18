import { NextRequest, NextResponse } from 'next/server'
import { listBlogPosts, saveBlogPost } from '../../../middleware/blogService.ts'
import { NO_STORE, blogGuard, failure } from '../../../middleware/routeHelpers.ts'

export async function GET(request: NextRequest) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    return NextResponse.json(await listBlogPosts(guard.cookie, request.nextUrl.searchParams.get('scope')), {
      headers: NO_STORE,
    })
  } catch (err) {
    return failure(err, 'blog list')
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    // Only these fields are forwarded; an owner or author sent by the client is never read, and a
    // create never carries an id.
    const { title, body, content, tags, status, removeImageIds } = await request.json()
    return NextResponse.json(await saveBlogPost(guard.cookie, { title, body, content, tags, status, removeImageIds }), {
      headers: NO_STORE,
    })
  } catch (err) {
    return failure(err, 'blog create')
  }
}
