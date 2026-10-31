import { NextRequest, NextResponse } from 'next/server'
import { createApplicationResume } from '../../../../../middleware/applicationService.ts'
import { NO_STORE, failure, featureOff, sessionCookie, unauthorized } from '../../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

/** Creates a resume from the application's tailor JSON (or returns the one already linked). */
export async function POST(request: NextRequest, { params }: Context) {
  const off = await featureOff('job-tracker')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await createApplicationResume(cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'application resume')
  }
}
