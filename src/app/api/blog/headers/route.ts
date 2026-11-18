import { NextResponse } from 'next/server'
import { getBlogConfig } from '../../../../middleware/blogConfigService.ts'
import { sampleBlogHeaders } from '../../../../middleware/blogService.ts'
import { NO_STORE } from '../../../../middleware/routeHelpers.ts'

/**
 * Public: a random sample of published post headers (id, title, excerpt, tags, publishedAt only).
 * Never an error to the visitor: off, empty or failing all answer an empty list.
 */
export async function GET() {
  try {
    const config = await getBlogConfig()
    if (!config.enabled) return NextResponse.json([], { headers: NO_STORE })
    return NextResponse.json(await sampleBlogHeaders(config.homeSampleSize), { headers: NO_STORE })
  } catch (err) {
    console.error('blog headers failed:', err)
    return NextResponse.json([], { headers: NO_STORE })
  }
}
