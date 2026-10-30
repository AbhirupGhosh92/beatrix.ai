import { getAuth } from "firebase-admin/auth";
import { ApiError, privateEndpoint } from "./http";
import { roleForEmail, verifiedEmail } from "./auth";

/** Session lifetime. Firebase allows 5 minutes to 14 days. */
const SESSION_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Sign-in: exchanges a fresh Firebase ID token for a session cookie value. Only allow-listed
 * emails (an `allowed_emails/{email}` entry that is not `allowed: false`) get one.
 */
export const sessionCreate = privateEndpoint(async (body) => {
  const { idToken } = body;
  if (typeof idToken !== "string" || !idToken) throw new ApiError(401, "Sign-in required.");

  let email: string;
  try {
    email = verifiedEmail(await getAuth().verifyIdToken(idToken));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired sign-in.");
  }

  const role = await roleForEmail(email);
  if (!role) throw new ApiError(403, `${email} is not on the allow list.`);

  const cookie = await getAuth().createSessionCookie(idToken, { expiresIn: SESSION_MS });
  return { cookie, maxAgeSeconds: SESSION_MS / 1000, email, role };
});

/**
 * Per-request check: a valid, unrevoked session cookie whose email is still allow-listed. The role
 * is re-read from Firestore here (never stored in the cookie), so changes apply immediately.
 */
export const sessionVerify = privateEndpoint(async (body) => {
  const { cookie } = body;
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
  return { email, role };
});
