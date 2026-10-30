import { NextRequest, NextResponse } from 'next/server'
import { deleteResume, getResume, saveResume } from '../../../../middleware/resumeService.ts'
import { NO_STORE, failure, featureOff, sessionCookie, unauthorized } from '../../../../middleware/routeHelpers.ts'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const off = await featureOff('resume-builder')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await getResume(cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'resume read')
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const off = await featureOff('resume-builder')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    const { title, data, structure, generation } = await request.json()
    return NextResponse.json(await saveResume(cookie, (await params).id, { title, data, structure, generation }), {
      headers: NO_STORE,
    })
  } catch (err) {
    return failure(err, 'resume save')
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const off = await featureOff('resume-builder')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await deleteResume(cookie, (await params).id), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'resume delete')
  }
}
