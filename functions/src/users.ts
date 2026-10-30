import { FieldValue } from "firebase-admin/firestore";
import { ApiError, privateEndpoint } from "./http";
import { requireAdmin, roleOf, verifiedUser } from "./auth";
import type { Role } from "./auth";
import { db } from "./firebase";

const USERS = "allowed_emails";
const MAX_USERS = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userRef = (email: string) => db().doc(`${USERS}/${email}`);

/**
 * First sign-in registration: creates `allowed_emails/{email}` as a `reader` when it does not exist.
 * An existing document is never overwritten; only `lastLoginAt` is touched, so roles and
 * revocations survive. The token must carry a verified email (otherwise 401).
 */
export const registerUser = privateEndpoint(async (body) => {
  const { email, name } = await verifiedUser(body.idToken);
  const ref = userRef(email);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.create(ref, {
        email,
        displayName: name,
        role: "reader",
        admin: false,
        allowed: true,
        createdAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      });
      return { created: true, role: "reader", allowed: true };
    }
    tx.update(ref, { lastLoginAt: FieldValue.serverTimestamp() });
    return { created: false, role: roleOf(snap.data()), allowed: snap.data()?.allowed !== false };
  });
});

const iso = (value: unknown): string | null =>
  value && typeof (value as { toDate?: unknown }).toDate === "function"
    ? (value as { toDate(): Date }).toDate().toISOString()
    : null;

/** Admin: every onboarded user. Legacy documents without `role` read as admin only when `admin: true`. */
export const adminListUsers = privateEndpoint(async (body) => {
  await requireAdmin(body.idToken);
  const snap = await db().collection(USERS).limit(MAX_USERS + 1).get();
  const users = snap.docs.slice(0, MAX_USERS).map((doc) => {
    const data = doc.data();
    return {
      email: doc.id,
      displayName: typeof data.displayName === "string" ? data.displayName : "",
      role: roleOf(data),
      allowed: data.allowed !== false,
      createdAt: iso(data.createdAt),
      lastLoginAt: iso(data.lastLoginAt),
    };
  });
  return { users, truncated: snap.size > MAX_USERS };
});

type Action = "add" | "setRole" | "revoke" | "restore";
const ACTIONS: readonly Action[] = ["add", "setRole", "revoke", "restore"];

/**
 * Admin: add a user, change a role, revoke or restore access. Rejects self-revoke, self-demote and
 * any change that would leave no active admin (counted inside the transaction).
 */
export const adminSetUser = privateEndpoint(async (body) => {
  const actor = await requireAdmin(body.idToken);

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) throw new ApiError(400, "A valid email is required.");
  const action = body.action as Action;
  if (!ACTIONS.includes(action)) throw new ApiError(400, "Unknown action.");
  const role = body.role as Role | undefined;
  if (action === "setRole" && role !== "reader" && role !== "admin") {
    throw new ApiError(400, "Role must be reader or admin.");
  }

  const ref = userRef(email);
  const losesAccess = action === "revoke" || (action === "setRole" && role === "reader");
  if (losesAccess && email === actor) {
    throw new ApiError(400, "You cannot revoke or demote your own account.");
  }

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const meta = { updatedAt: FieldValue.serverTimestamp(), updatedBy: actor };

    if (action === "add") {
      if (snap.exists) throw new ApiError(409, `${email} already exists.`);
      tx.create(ref, {
        email,
        displayName: "",
        role: "reader",
        admin: false,
        allowed: true,
        createdAt: FieldValue.serverTimestamp(),
        ...meta,
      });
      return;
    }
    if (!snap.exists) throw new ApiError(404, `${email} is not onboarded.`);

    const target = snap.data();
    if (losesAccess && roleOf(target) === "admin" && target?.allowed !== false) {
      const admins = await tx.get(db().collection(USERS).where("admin", "==", true));
      const others = admins.docs.filter((d) => d.id !== email && d.data().allowed !== false);
      if (others.length === 0) throw new ApiError(400, "At least one active admin must remain.");
    }

    if (action === "setRole") tx.update(ref, { role, admin: role === "admin", ...meta });
    else tx.update(ref, { allowed: action === "restore", ...meta });
  });

  return { success: true, email, action };
});
