import { FieldValue } from "firebase-admin/firestore";
import { requirePermission, roleForEmail } from "./auth";
import { db, resumesBucket } from "./firebase";
import { ApiError, privateEndpoint } from "./http";
import { resolveRole } from "./policy";
import { OWNERS, ownerRef, prefixOf } from "./resumes";

// Admin cleanup of resume data that outlived its owner's access. Admins never see resume content:
// the list returns only the email, count, size and time, and the purge deletes without reading.

const MAX_OWNERS = 500;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DELETE_BATCH = 10;

const iso = (value: unknown): string | null =>
  value && typeof (value as { toDate?: unknown }).toDate === "function"
    ? (value as { toDate(): Date }).toDate().toISOString()
    : null;

/** Owners that still hold resumes but whose access is revoked or whose allow-list entry is gone. */
export const adminListResumeOwners = privateEndpoint(async (body) => {
  await requirePermission(body.idToken, "cms:write");
  const snap = await db().collection(OWNERS).where("count", ">", 0).limit(MAX_OWNERS + 1).get();
  const docs = snap.docs.slice(0, MAX_OWNERS);
  if (docs.length === 0) return { owners: [], truncated: false };

  const users = await db().getAll(...docs.map((doc) => db().doc(`allowed_emails/${doc.id}`)));
  const owners = docs.flatMap((doc, index) => {
    const user = users[index];
    if (resolveRole(user.exists ? user.data() : undefined) !== null) return []; // still has access
    const data = doc.data();
    return [
      {
        email: doc.id,
        count: Number(data.count ?? 0),
        bytes: Number(data.bytes ?? 0),
        updatedAt: iso(data.updatedAt),
      },
    ];
  });
  return { owners, truncated: snap.size > MAX_OWNERS };
});

/**
 * Permanently deletes every resume of an orphaned owner, including all older versions (no
 * recovery). Refused for an owner who still has access, and the admin must type the owner's email.
 */
export const adminPurgeResumeOwner = privateEndpoint(async (body) => {
  const actor = await requirePermission(body.idToken, "cms:write");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const confirm = typeof body.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : "";
  if (!EMAIL.test(email)) throw new ApiError(400, "A valid email is required.");
  if (confirm !== email) throw new ApiError(400, "Type the owner's email exactly to confirm.");
  if (await roleForEmail(email)) {
    throw new ApiError(409, "This user still has access. Revoke their access before deleting their data.");
  }

  // Every generation, so noncurrent versions go too and nothing stays recoverable. With
  // `versions: true` each returned File is bound to its own generation, so delete() removes exactly it.
  const [files] = await resumesBucket().getFiles({ prefix: prefixOf(email), versions: true });
  for (let i = 0; i < files.length; i += DELETE_BATCH) {
    await Promise.all(files.slice(i, i + DELETE_BATCH).map((file) => file.delete({ ignoreNotFound: true })));
  }

  await ownerRef(email).delete();
  await db().collection("resume_audit").add({
    action: "purge",
    actor,
    owner: email,
    objects: files.length,
    at: FieldValue.serverTimestamp(),
  });
  return { success: true, deletedObjects: files.length };
});
