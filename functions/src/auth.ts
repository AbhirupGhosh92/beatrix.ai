import { getAuth } from "firebase-admin/auth";
import { ApiError } from "./http";
import { db } from "./firebase";

export type Role = "reader" | "admin";

/** Effective role of an `allowed_emails` document: `role`, or the legacy `admin: true` flag. */
export function roleOf(data: FirebaseFirestore.DocumentData | undefined): Role {
  return data?.role === "admin" || data?.admin === true ? "admin" : "reader";
}

/** Verifies the forwarded Firebase ID token; returns the caller's verified, lowercase email and name. */
export async function verifiedUser(idToken: unknown): Promise<{ email: string; name: string }> {
  if (typeof idToken !== "string" || !idToken) throw new ApiError(401, "Sign-in required.");

  let email: string | undefined;
  let name = "";
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    email = decoded.email_verified ? decoded.email?.trim().toLowerCase() : undefined;
    name = typeof decoded.name === "string" ? decoded.name : "";
  } catch {
    throw new ApiError(401, "Invalid or expired sign-in.");
  }
  if (!email) throw new ApiError(401, "A verified email is required.");
  return { email, name };
}

/**
 * Admin gate: the caller's Firebase ID token (forwarded by the Next.js server) must be valid and
 * carry a verified email whose `allowed_emails/{email}` Firestore document has `role: "admin"` (or
 * the legacy `admin: true`) and is not `allowed: false`. Returns the admin's email.
 */
export async function requireAdmin(idToken: unknown): Promise<string> {
  if (typeof idToken !== "string" || !idToken) throw new ApiError(401, "Admin sign-in required.");
  const { email } = await verifiedUser(idToken);

  const snap = await db().doc(`allowed_emails/${email}`).get();
  const data = snap.data();
  if (!snap.exists || roleOf(data) !== "admin" || data?.allowed === false) {
    throw new ApiError(403, `${email} is not an admin.`);
  }
  return email;
}
