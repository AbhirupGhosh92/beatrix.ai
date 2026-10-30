import { getAuth } from "firebase-admin/auth";
import { ApiError } from "./http";
import { db } from "./firebase";
import { can, resolveRole, type Permission, type Role } from "./policy";

/**
 * The role of a verified email, read from Firestore on every call so a promotion, demotion or
 * revocation applies to the very next request. Null when the email has no access.
 */
export async function roleForEmail(email: string): Promise<Role | null> {
  const snap = await db().doc(`allowed_emails/${email.trim().toLowerCase()}`).get();
  return resolveRole(snap.exists ? snap.data() : undefined);
}

/** The lowercase email of a verified Firebase user, or an ApiError(401). */
export function verifiedEmail(decoded: { email?: string; email_verified?: boolean }): string {
  const email = decoded.email_verified ? decoded.email?.trim().toLowerCase() : undefined;
  if (!email) throw new ApiError(401, "A verified email is required.");
  return email;
}

/**
 * Permission gate: the caller's Firebase ID token (forwarded by the Next.js server) must be valid
 * and carry a verified email whose `allowed_emails/{email}` entry resolves to a role holding
 * `permission`. Returns the caller's email.
 */
export async function requirePermission(idToken: unknown, permission: Permission): Promise<string> {
  if (typeof idToken !== "string" || !idToken) throw new ApiError(401, "Admin sign-in required.");

  let email: string;
  try {
    email = verifiedEmail(await getAuth().verifyIdToken(idToken));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired sign-in.");
  }

  const role = await roleForEmail(email);
  if (!can(role, permission)) throw new ApiError(403, `${email} is not allowed to do this.`);
  return email;
}

/**
 * Permission gate for the user-facing APIs: the `__session` cookie the Next.js server forwards must
 * be a valid, unrevoked session whose email still resolves to a role holding `permission`. The
 * owner of any data is this verified email, never something taken from the request body.
 */
export async function requireSession(
  cookie: unknown,
  permission: Permission,
): Promise<{ email: string; role: Role }> {
  if (typeof cookie !== "string" || !cookie) throw new ApiError(401, "Sign-in required.");

  let email: string;
  try {
    email = verifiedEmail(await getAuth().verifySessionCookie(cookie, true));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired session.");
  }

  const role = await roleForEmail(email);
  if (!role) throw new ApiError(401, "This account no longer has access.");
  if (!can(role, permission)) throw new ApiError(403, "Not allowed.");
  return { email, role };
}
