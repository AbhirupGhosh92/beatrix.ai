import { getAuth } from "firebase-admin/auth";
import { ApiError } from "./http";
import { db } from "./firebase";

/**
 * Admin gate: the caller's Firebase ID token (forwarded by the Next.js server) must be valid and
 * carry a verified email whose `allowed_emails/{email}` Firestore document has `admin: true` (and
 * is not `allowed: false`). Returns the admin's email.
 */
export async function requireAdmin(idToken: unknown): Promise<string> {
  if (typeof idToken !== "string" || !idToken) throw new ApiError(401, "Admin sign-in required.");

  let email: string | undefined;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    email = decoded.email_verified ? decoded.email?.trim().toLowerCase() : undefined;
  } catch {
    throw new ApiError(401, "Invalid or expired sign-in.");
  }
  if (!email) throw new ApiError(401, "A verified email is required.");

  const snap = await db().doc(`allowed_emails/${email}`).get();
  const data = snap.data();
  if (!snap.exists || data?.admin !== true || data?.allowed === false) {
    throw new ApiError(403, `${email} is not an admin.`);
  }
  return email;
}
