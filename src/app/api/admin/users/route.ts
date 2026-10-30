import { NextRequest, NextResponse } from 'next/server'
import { listUsers, setUser } from '../../../../middleware/userService.ts'
import { NO_STORE, bearerToken, failure, unauthorized } from '../../../../middleware/routeHelpers.ts'

export async function GET(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return unauthorized('Admin sign-in required.')
  try {
    return NextResponse.json(await listUsers(token), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'admin users list')
  }
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return unauthorized('Admin sign-in required.')
  try {
    const { email, action, role } = await request.json()
    return NextResponse.json(await setUser(token, email, action, role), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'admin users update')
  }
}
