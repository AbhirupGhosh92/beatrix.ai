import { getIdToken } from './firebase.ts'

/**
 * Registers the signed-in user on first sign-in (a `reader` document is created server-side; an
 * existing one is left alone). Never throws: on failure the caller's allow-list check decides, so
 * an unregistered email stays locked out.
 */
export async function registerCurrentUser(): Promise<void> {
  try {
    const token = await getIdToken()
    if (!token) return
    const res = await fetch('/api/register', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) console.warn(`User registration failed (HTTP ${res.status}).`)
  } catch (error) {
    console.warn('User registration failed:', error)
  }
}
