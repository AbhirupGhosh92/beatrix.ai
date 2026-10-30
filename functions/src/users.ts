import { FieldValue } from "firebase-admin/firestore";
import { ApiError, privateEndpoint } from "./http";
import { requirePermission } from "./auth";
import { db } from "./firebase";
import { ROLES, resolveRole, type Role } from "./policy";

const USERS = "allowed_emails";
const MAX_USERS = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userRef = (email: string) => db().doc(`${USERS}/${email}`);

/**
 * First sign-in registration: creates `allowed_emails/{email}` as a `reader` when it does not
 * exist. An existing document is never overwritten; only `lastLoginAt` is touched, so roles and
 * revocations survive. Called by `sessionCreate` once the token's email is verified.
 */
export async function registerIfAbsent(email: string, displayName: string): Promise<void> {
  const ref = userRef(email);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      tx.update(ref, { lastLoginAt: FieldValue.serverTimestamp() });
    } else {
      tx.create(ref, {
        email,
        displayName,
        role: "reader",
        allowed: true,
        createdAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

const iso = (value: unknown): string | null =>
  value && typeof (value as { toDate?: unknown }).toDate === "function"
    ? (value as { toDate(): Date }).toDate().toISOString()
    : null;

/** Admin: every onboarded user with the role resolved the same way the access gate does. */
export const adminListUsers = privateEndpoint(async (body) => {
  await requirePermission(body.idToken, "cms:write");
  const snap = await db().collection(USERS).limit(MAX_USERS + 1).get();
  const users = snap.docs.slice(0, MAX_USERS).map((doc) => {
    const data = doc.data();
    return {
      email: doc.id,
      displayName: typeof data.displayName === "string" ? data.displayName : "",
      role: resolveRole({ ...data, allowed: true }) ?? "reader",
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
  const actor = await requirePermission(body.idToken, "cms:write");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) throw new ApiError(400, "A valid email is required.");
  const action = body.action as Action;
  if (!ACTIONS.includes(action)) throw new ApiError(400, "Unknown action.");
  const role = body.role as Role | undefined;
  if (action === "setRole" && !ROLES.includes(role as Role)) {
    throw new ApiError(400, `Role must be one of: ${ROLES.join(", ")}.`);
  }

  const ref = userRef(email);
  const losesAdmin = action === "revoke" || (action === "setRole" && role !== "admin");
  if (losesAdmin && email === actor) {
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
        allowed: true,
        createdAt: FieldValue.serverTimestamp(),
        ...meta,
      });
      return;
    }
    if (!snap.exists) throw new ApiError(404, `${email} is not onboarded.`);

    if (losesAdmin && resolveRole(snap.data()) === "admin") {
      // The actor is an admin other than the target (self-changes were rejected above), so one
      // active admin remains as long as the actor still is one. Re-reading the actor inside the
      // transaction closes the race where two admins demote each other at the same time.
      const actorSnap = await tx.get(userRef(actor));
      if (resolveRole(actorSnap.data()) !== "admin") {
        throw new ApiError(400, "At least one active admin must remain.");
      }
    }

    if (action === "setRole") tx.update(ref, { role, ...meta });
    else tx.update(ref, { allowed: action === "restore", ...meta });
  });

  return { success: true, email, action };
});
