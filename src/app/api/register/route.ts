import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '../../../middleware/userService.ts'
import { NO_STORE, bearerToken, failure, unauthorized } from '../../../middleware/routeHelpers.ts'

// Called right after Google sign-in: creates the user's allowed_emails document as a reader on
// the first sign-in and never changes an existing one (see the registerUser function).
export async function POST(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return unauthorized('Sign-in required.')
  try {
    return NextResponse.json(await registerUser(token), { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'user registration')
  }
}
