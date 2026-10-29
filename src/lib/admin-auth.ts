// Server-side check for the admin API: the caller must send a Firebase ID token whose verified
// email has `admin: true` on its `allowed_emails/{email}` Firestore document.
//
// No Admin SDK or server credentials are needed: the token is verified through the Identity
// Toolkit REST API and the Firestore document is read *as that user*, so the security rules
// apply (signed-in users can read `allowed_emails`).
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

/** Returns the admin's email, or null when the request is not from an admin. */
export async function requireAdmin(request: Request): Promise<string | null> {
  // The dev server is local, so skip the check there; production always enforces it.
  if (process.env.NODE_ENV !== 'production') return 'local-dev'
  if (!API_KEY || !PROJECT_ID) return null

  const idToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!idToken) return null

  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!lookup.ok) return null
    const user = (await lookup.json()).users?.[0]
    const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : ''
    if (!email || user.emailVerified !== true) return null

    const docRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/allowed_emails/${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${idToken}` }, signal: AbortSignal.timeout(10_000) },
    )
    if (!docRes.ok) return null
    const fields = (await docRes.json()).fields ?? {}
    return fields.admin?.booleanValue === true && fields.allowed?.booleanValue !== false ? email : null
  } catch {
    return null
  }
}
