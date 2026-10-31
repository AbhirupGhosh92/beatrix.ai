import { FieldValue } from "firebase-admin/firestore";
import { requirePermission, roleForEmail } from "./auth";
import { db, resumesBucket } from "./firebase";
import { ApiError, privateEndpoint } from "./http";
import { resolveRole } from "./policy";
import { APPLICATION_OWNERS, ownerDoc } from "./applications";
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

/**
 * Owners that still hold resumes or applications but whose access is revoked or whose allow-list
 * entry is gone. Rows carry counts and sizes only, never titles, companies, notes or any content.
 */
export const adminListResumeOwners = privateEndpoint(async (body) => {
  await requirePermission(body.idToken, "cms:write");
  const [resumeSnap, appSnap] = await Promise.all([
    db().collection(OWNERS).where("count", ">", 0).limit(MAX_OWNERS + 1).get(),
    db().collection(APPLICATION_OWNERS).where("count", ">", 0).limit(MAX_OWNERS + 1).get(),
  ]);

  const rows = new Map<string, { email: string; count: number; applications: number; bytes: number; updatedAt: string | null }>();
  const row = (email: string) => {
    let r = rows.get(email);
    if (!r) rows.set(email, (r = { email, count: 0, applications: 0, bytes: 0, updatedAt: null }));
    return r;
  };
  for (const doc of resumeSnap.docs.slice(0, MAX_OWNERS)) {
    const data = doc.data();
    Object.assign(row(doc.id), { count: Number(data.count ?? 0), bytes: Number(data.bytes ?? 0), updatedAt: iso(data.updatedAt) });
  }
  for (const doc of appSnap.docs.slice(0, MAX_OWNERS)) {
    const data = doc.data();
    const r = row(doc.id);
    r.applications = Number(data.count ?? 0);
    const at = iso(data.updatedAt);
    if (at && (!r.updatedAt || at > r.updatedAt)) r.updatedAt = at;
  }
  const truncated = resumeSnap.size > MAX_OWNERS || appSnap.size > MAX_OWNERS;
  if (rows.size === 0) return { owners: [], truncated };

  const emails = [...rows.keys()];
  const users = await db().getAll(...emails.map((email) => db().doc(`allowed_emails/${email}`)));
  const owners = emails.flatMap((email, index) => {
    const user = users[index];
    if (resolveRole(user.exists ? user.data() : undefined) !== null) return []; // still has access
    return [rows.get(email)!];
  });
  return { owners, truncated };
});

/**
 * Permanently deletes every resume of an orphaned owner, including all older versions (no
 * recovery), and all of their job applications. Refused for an owner who still has access, and the admin must type the owner's email.
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

  // Applications live in a subcollection under the owner document; recursiveDelete removes both.
  const applications = Number((await ownerDoc(email).get()).data()?.count ?? 0);
  await db().recursiveDelete(ownerDoc(email));

  await ownerRef(email).delete();
  await db().collection("resume_audit").add({
    action: "purge",
    actor,
    owner: email,
    objects: files.length,
    applications,
    at: FieldValue.serverTimestamp(),
  });
  return { success: true, deletedObjects: files.length, deletedApplications: applications };
});
