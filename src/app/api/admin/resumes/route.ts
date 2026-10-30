import { NextRequest, NextResponse } from 'next/server'
import { listOrphanedOwners, purgeOwner } from '../../../../middleware/resumeAdminService.ts'
import { NO_STORE, bearerToken, failure, unauthorized } from '../../../../middleware/routeHelpers.ts'

export async function GET(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return unauthorized('Admin sign-in required.')
  try {
    return NextResponse.json(await listOrphanedOwners(token), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'orphaned resume owners')
  }
}

/** Permanently deletes an orphaned owner's resume data; the body must repeat the owner's email. */
export async function POST(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return unauthorized('Admin sign-in required.')
  try {
    const { email, confirmEmail } = await request.json()
    return NextResponse.json(await purgeOwner(token, email, confirmEmail), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'resume data purge')
  }
}
