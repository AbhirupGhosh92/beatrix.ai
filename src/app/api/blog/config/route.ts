import { NextRequest, NextResponse } from 'next/server'
import type { BlogEditorConfig } from '../../../../data/blogConfig.ts'
import { getBlogConfig } from '../../../../middleware/blogConfigService.ts'
import { NO_STORE, blogGuard, failure } from '../../../../middleware/routeHelpers.ts'

/** The limits the editor shows and checks early (the function enforces them again). */
export async function GET(request: NextRequest) {
  try {
    const guard = await blogGuard(request)
    if (guard instanceof NextResponse) return guard
    const config = await getBlogConfig()
    const body: BlogEditorConfig = {
      maxTitleLength: config.maxTitleLength,
      maxBodyBytes: config.maxBodyBytes,
      maxTagsPerPost: config.maxTagsPerPost,
      maxTagLength: config.maxTagLength,
      maxImageBytes: config.maxImageBytes,
      maxImagesPerPost: config.maxImagesPerPost,
      isAdmin: guard.role === 'admin',
    }
    return NextResponse.json(body, { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'blog config')
  }
}
