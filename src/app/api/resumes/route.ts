import { NextRequest, NextResponse } from 'next/server'
import { createResume, listResumes } from '../../../middleware/resumeService.ts'
import { NO_STORE, failure, featureOff, sessionCookie, unauthorized } from '../../../middleware/routeHelpers.ts'

export async function GET(request: NextRequest) {
  const off = await featureOff('resume-builder')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await listResumes(cookie), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'resume list')
  }
}

export async function POST(request: NextRequest) {
  const off = await featureOff('resume-builder')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    // Only these fields are forwarded; an owner or id sent by the client is never read.
    const { title, structure, data } = await request.json()
    return NextResponse.json(await createResume(cookie, { title, structure, data }), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'resume create')
  }
}
