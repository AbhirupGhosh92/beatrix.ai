import { NextRequest, NextResponse } from 'next/server'
import { createApplication, listApplications } from '../../../middleware/applicationService.ts'
import { NO_STORE, failure, featureOff, sessionCookie, unauthorized } from '../../../middleware/routeHelpers.ts'

export async function GET(request: NextRequest) {
  const off = await featureOff('job-tracker')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await listApplications(cookie), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'application list')
  }
}

export async function POST(request: NextRequest) {
  const off = await featureOff('job-tracker')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    // Only these fields are forwarded; an owner or id sent by the client is never read.
    const { company, role, jobUrl, status, appliedAt, notes, labels, tailor } = await request.json()
    return NextResponse.json(
      await createApplication(cookie, { company, role, jobUrl, status, appliedAt, notes, labels, tailor }),
      { headers: NO_STORE },
    )
  } catch (err) {
    return failure(err, 'application create')
  }
}
