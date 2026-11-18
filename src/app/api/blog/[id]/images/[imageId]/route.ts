import { NextRequest, NextResponse } from 'next/server'
import { getBlogImage } from '../../../../../../middleware/blogService.ts'
import { blogGuard, failure } from '../../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string; imageId: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    const { id, imageId } = await params
    const image = await getBlogImage(guard.cookie, id, imageId)
    return new NextResponse(Buffer.from(image.dataBase64, 'base64'), {
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    return failure(err, 'blog image read')
  }
}
