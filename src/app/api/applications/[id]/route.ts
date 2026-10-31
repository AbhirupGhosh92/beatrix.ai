import { NextRequest, NextResponse } from 'next/server'
import { deleteApplication, getApplication, updateApplication } from '../../../../middleware/applicationService.ts'
import { NO_STORE, failure, featureOff, sessionCookie, unauthorized } from '../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const off = await featureOff('job-tracker')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await getApplication(cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'application read')
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const off = await featureOff('job-tracker')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    const { company, role, jobUrl, status, appliedAt, notes, labels, tailor } = await request.json()
    return NextResponse.json(
      await updateApplication(cookie, (await params).id, { company, role, jobUrl, status, appliedAt, notes, labels, tailor }),
      { headers: NO_STORE },
    )
  } catch (err) {
    return failure(err, 'application update')
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const off = await featureOff('job-tracker')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await deleteApplication(cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'application delete')
  }
}
