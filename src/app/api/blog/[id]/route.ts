import { NextRequest, NextResponse } from 'next/server'
import { deleteBlogPost, getBlogPost, saveBlogPost } from '../../../../middleware/blogService.ts'
import { NO_STORE, blogGuard, failure } from '../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    return NextResponse.json(await getBlogPost(guard.cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'blog read')
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    const { title, body, tags, status, version, removeImageIds } = await request.json()
    const id = (await params).id
    return NextResponse.json(
      await saveBlogPost(guard.cookie, { id, title, body, tags, status, version, removeImageIds }),
      { headers: NO_STORE },
    )
  } catch (err) {
    return failure(err, 'blog save')
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    return NextResponse.json(await deleteBlogPost(guard.cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'blog delete')
  }
}
