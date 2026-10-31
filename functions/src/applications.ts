import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { requireSession } from "./auth";
import {
  checkNew,
  checkPatch,
  checkTailor,
  readLimits,
  type ApplicationFields,
  type TailorContext,
  type TrackerLimits,
} from "./applicationValidation";
import { db, resumesBucket } from "./firebase";
import { ApiError, privateEndpoint } from "./http";
import type { Role } from "./policy";
import { canCustomize, createResumeFor, prefixOf, readConfig, resumeFile } from "./resumes";

// Job applications. Like the resumes, every handler verifies the caller's session cookie here and
// works only under that owner's path (`application_owners/{email}/applications/{id}`), so another
// user's id simply does not exist for the caller (404). The Next.js server forwards the tracker
// limits and the resume config; only the site can call these functions (IAM).

export const APPLICATION_OWNERS = "application_owners";
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A tailored-resume creation older than this is treated as abandoned and can be retried. */
const CLAIM_MS = 30_000;
const MAX_TITLE = 80;

interface StoredApplication extends ApplicationFields {
  id: string;
  tailor: unknown | null;
  /** The linked resume's id, or null. */
  resumeId: string | null;
  resumeClaimAt?: number | null;
  createdAt: string;
  updatedAt: string;
}

export const ownerDoc = (email: string) => db().doc(`${APPLICATION_OWNERS}/${email}`);
const items = (email: string) => ownerDoc(email).collection("applications");

function itemRef(email: string, id: unknown) {
  if (typeof id !== "string" || !ID.test(id)) throw new ApiError(404, "Application not found.");
  return items(email).doc(id);
}

async function readItem(email: string, id: unknown) {
  const ref = itemRef(email, id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, "Application not found.");
  return { ref, application: snap.data() as StoredApplication };
}

function tracker(body: Record<string, unknown>): { limits: TrackerLimits; tailor: TailorContext } {
  const config = readConfig(body.config);
  return {
    limits: readLimits((body.config as { tracker?: unknown }).tracker),
    tailor: { structure: config.defaultStructure, rules: config.rules },
  };
}

/** The claim marker is internal bookkeeping and never leaves the function. */
function withoutClaim(a: StoredApplication): Omit<StoredApplication, "resumeClaimAt"> {
  const copy = { ...a };
  delete copy.resumeClaimAt;
  return copy;
}

/** What the list shows: everything except the (large) tailor JSON, of which only the presence is sent. */
function summary(a: StoredApplication, resumeId: string | null) {
  const { tailor, ...rest } = withoutClaim(a);
  return { ...rest, resumeId, hasTailor: tailor !== null && tailor !== undefined };
}

/** Ids of the owner's resumes that still exist (one prefix listing). */
async function liveResumeIds(email: string): Promise<Set<string>> {
  const [files] = await resumesBucket().getFiles({ prefix: prefixOf(email) });
  return new Set(
    files
      .filter((f) => f.name.endsWith(".json"))
      .map((f) => f.name.slice(f.name.lastIndexOf("/") + 1, -".json".length)),
  );
}

/** What a role may hold: the base cap, or only the safety limit for roles that may customize. */
const capFor = (role: Role, limits: TrackerLimits) =>
  canCustomize(role) ? limits.maxApplications : Math.min(limits.baseMaxApplications, limits.maxApplications);

/** The caller's applications. A link to a resume that was deleted is reported (and cleared) as none. */
export const applicationList = privateEndpoint(async (body) => {
  const { email, role } = await requireSession(body.cookie, "features:basic");
  const { limits } = tracker(body);
  const snap = await items(email).limit(limits.maxApplications + 1).get();
  const all = snap.docs.map((d) => d.data() as StoredApplication);

  let live: Set<string> | undefined;
  if (all.some((a) => a.resumeId)) live = await liveResumeIds(email);
  const stale = all.filter((a) => a.resumeId && !live?.has(a.resumeId));
  if (stale.length > 0) {
    const batch = db().batch();
    for (const a of stale) batch.update(items(email).doc(a.id), { resumeId: null });
    await batch.commit();
  }
  const applications = all
    .map((a) => summary(a, a.resumeId && live?.has(a.resumeId) ? a.resumeId : null))
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt) || b.createdAt.localeCompare(a.createdAt));
  return {
    applications,
    statuses: limits.statuses,
    limits: { ...limits, statuses: undefined },
    // The cap shown to the user: a number for base users, null when only the safety limit applies.
    cap: canCustomize(role) ? null : capFor(role, limits),
  };
});

/** One application including its tailor JSON. */
export const applicationGet = privateEndpoint(async (body) => {
  const { email } = await requireSession(body.cookie, "features:basic");
  const { application } = await readItem(email, body.id);
  return { application: withoutClaim(application) };
});

/** Creates an application. The cap is checked in a transaction so parallel creates cannot pass it. */
export const applicationCreate = privateEndpoint(async (body) => {
  const { email, role } = await requireSession(body.cookie, "features:basic");
  const { limits, tailor: ctx } = tracker(body);
  const fields = checkNew(body, limits);
  const tailor = body.tailor === undefined || body.tailor === null ? null : checkTailor(body.tailor, limits, ctx);

  const id = randomUUID();
  const now = new Date().toISOString();
  const stored: StoredApplication = { id, ...fields, tailor, resumeId: null, createdAt: now, updatedAt: now };

  await db().runTransaction(async (tx) => {
    const owner = ownerDoc(email);
    const count = Number((await tx.get(owner)).data()?.count ?? 0);
    const cap = capFor(role, limits);
    if (count >= cap) {
      throw new ApiError(409, `You can keep at most ${cap} applications. Delete one to add another.`);
    }
    tx.set(owner, { email, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(items(email).doc(id), stored);
  });
  return { application: summary(stored, null) };
});

/** Changes only the fields that are present. `tailor: null` removes the tailor JSON. */
export const applicationUpdate = privateEndpoint(async (body) => {
  const { email } = await requireSession(body.cookie, "features:basic");
  const { limits, tailor: ctx } = tracker(body);
  const { ref, application } = await readItem(email, body.id);

  const patch: Record<string, unknown> = checkPatch(body, limits);
  if (body.tailor !== undefined) patch.tailor = body.tailor === null ? null : checkTailor(body.tailor, limits, ctx);
  patch.updatedAt = new Date().toISOString();
  await ref.update(patch);
  const next = { ...application, ...patch } as StoredApplication;
  return { application: summary(next, next.resumeId) };
});

/** Deletes an application and its tailor JSON; a resume already created from it is kept. */
export const applicationDelete = privateEndpoint(async (body) => {
  const { email } = await requireSession(body.cookie, "features:basic");
  const ref = itemRef(email, body.id);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "Application not found.");
    const owner = ownerDoc(email);
    const count = Number((await tx.get(owner)).data()?.count ?? 0);
    tx.delete(ref);
    tx.set(owner, { email, count: Math.max(0, count - 1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { success: true };
});

/**
 * Creates a resume from the application's tailor JSON and links it. The resume goes through
 * `createResumeFor`, so it counts against the same cap as every other resume. When the application
 * already has a live linked resume that one is returned instead of creating another.
 */
export const applicationCreateResume = privateEndpoint(async (body) => {
  const { email, role } = await requireSession(body.cookie, "features:basic");
  const config = readConfig(body.config);
  const { ref, application } = await readItem(email, body.id);

  if (application.tailor === null || application.tailor === undefined) {
    throw new ApiError(400, "Add a tailor JSON to this application first.");
  }
  // Claim the application so a double click cannot create two resumes. The link is read inside the
  // transaction: a call that started earlier may have linked a resume since this one began.
  const claim = (ignoreLink: boolean) =>
    db().runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as StoredApplication | undefined;
      if (!current) throw new ApiError(404, "Application not found.");
      if (!ignoreLink && current.resumeId) return current.resumeId;
      if (current.resumeClaimAt && Date.now() - current.resumeClaimAt < CLAIM_MS) {
        throw new ApiError(409, "A resume is already being created for this application.");
      }
      tx.update(ref, { resumeClaimAt: Date.now() });
      return null;
    });

  const linked = await claim(false);
  if (linked) {
    const [exists] = await resumeFile(email, linked).exists();
    if (exists) return { resumeId: linked, created: false };
    await claim(true); // the linked resume was deleted: take the claim and create a new one
  }

  try {
    const name = `${application.company} - ${application.role}`.slice(0, MAX_TITLE);
    const { resume } = await createResumeFor(email, role, config, { title: name, data: application.tailor });
    await ref.update({ resumeId: resume.id, resumeClaimAt: null, updatedAt: new Date().toISOString() });
    return { resumeId: resume.id, created: true };
  } catch (err) {
    await ref.update({ resumeClaimAt: null });
    throw err;
  }
});
