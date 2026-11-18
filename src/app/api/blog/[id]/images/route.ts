import { NextRequest, NextResponse } from 'next/server'
import { uploadBlogImage } from '../../../../../middleware/blogService.ts'
import { NO_STORE, blogGuard, failure } from '../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    // The claimed content type is ignored: the function detects the type from the bytes.
    const { name, dataBase64 } = await request.json()
    return NextResponse.json(await uploadBlogImage(guard.cookie, (await params).id, { name, dataBase64 }), {
      headers: NO_STORE,
    })
  } catch (err) {
    return failure(err, 'blog image upload')
  }
}
