import { NextResponse } from 'next/server'
import { getBlogConfig } from '../../../../../../middleware/blogConfigService.ts'
import { getPublicBlogImage } from '../../../../../../middleware/blogService.ts'
import { NO_STORE, failure } from '../../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string; imageId: string }> }

const IMAGE_ID = /^[A-Za-z0-9_-]{1,100}$/
const notFound = () => NextResponse.json({ error: 'Not found.' }, { status: 404, headers: NO_STORE })

/** Public: an image of a published post. 404 while the blog is off, for a draft and for another post's image. */
export async function GET(_request: Request, { params }: Context) {
  try {
    const { id, imageId } = await params
    if (!IMAGE_ID.test(imageId)) return notFound()
    if (!(await getBlogConfig()).enabled) return notFound()
    const image = await getPublicBlogImage(id, imageId)
    if (!image) return notFound()
    return new NextResponse(Buffer.from(image.dataBase64, 'base64'), {
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'public, max-age=30',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'sandbox',
      },
    })
  } catch (err) {
    return failure(err, 'public blog image')
  }
}
