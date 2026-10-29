import { NextRequest, NextResponse } from 'next/server'
import { getFile, listFiles, saveFile } from '../../../../middleware/adminService.ts'
import { CloudFunctionError } from '../../../../middleware/cloudFunctions.ts'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

function bearerToken(request: NextRequest): string | null {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
}

function failure(err: unknown) {
  if (err instanceof CloudFunctionError) {
    return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE })
  }
  console.error('admin cms request failed:', err)
  return NextResponse.json({ error: 'Request failed.' }, { status: 500, headers: NO_STORE })
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401, headers: NO_STORE })
  try {
    const file = new URL(request.url).searchParams.get('file')
    const data = file ? await getFile(token, file) : await listFiles(token)
    return NextResponse.json(data, { headers: NO_STORE })
  } catch (err) {
    return failure(err)
  }
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401, headers: NO_STORE })
  try {
    const { file, content } = await request.json()
    return NextResponse.json(await saveFile(token, file, content), { headers: NO_STORE })
  } catch (err) {
    return failure(err)
  }
}
