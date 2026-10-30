import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { requireSession } from "./auth";
import { db, resumesBucket } from "./firebase";
import { ApiError, privateEndpoint } from "./http";
import { can, type Role } from "./policy";
import {
  checkDraft,
  emptyData,
  validateStructure,
  type ResumeData,
  type Structure,
  type StructureRules,
} from "./resumeValidation";

// User resumes. Every handler verifies the caller's session cookie here (the owner is that
// verified email, never a request field) and works only inside that owner's prefix, so another
// user's id simply does not exist for the caller (404). The Next.js server also forwards the
// resume config's limits and rules; only the site can call these functions (IAM), and the config
// is admin data, not user input.

const OWNERS = "resume_owners";
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_TITLE = 80;

interface Config {
  baseMaxResumes: number;
  rules: StructureRules;
  defaultStructure: Structure;
}

interface StoredResume {
  id: string;
  title: string;
  /** null = the current default structure (base users); advanced users keep their own. */
  structure: Structure | null;
  data: ResumeData;
  createdAt: string;
  updatedAt: string;
}

const ownerHash = (email: string) => createHash("sha256").update(email).digest("hex");
const prefixOf = (email: string) => `owners/${ownerHash(email)}/`;
const ownerRef = (email: string) => db().doc(`${OWNERS}/${email}`);

function readConfig(value: unknown): Config {
  const c = value as Partial<Config> | null;
  if (
    !c ||
    typeof c !== "object" ||
    !Number.isInteger(c.baseMaxResumes) ||
    !c.rules ||
    !Array.isArray(c.defaultStructure?.sections)
  ) {
    throw new ApiError(500, "Resume configuration is unavailable.");
  }
  return c as Config;
}

function resumeFile(email: string, id: unknown) {
  if (typeof id !== "string" || !ID.test(id)) throw new ApiError(404, "Resume not found.");
  return resumesBucket().file(`${prefixOf(email)}${id}.json`);
}

function title(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > MAX_TITLE) {
    throw new ApiError(400, `Title must be 1-${MAX_TITLE} characters.`);
  }
  return value.trim();
}

/** Base users use the default structure; roles with features:advanced may keep their own. */
const canCustomize = (role: Role) => can(role, "features:advanced");

function problems(list: string[], message: string): never {
  throw new ApiError(400, `${message} ${list.slice(0, 3).join(" ")}`.trim());
}

function isPreconditionFailed(err: unknown): boolean {
  return (err as { code?: number })?.code === 412;
}

async function readResume(email: string, id: unknown) {
  const file = resumeFile(email, id);
  const [exists] = await file.exists();
  if (!exists) throw new ApiError(404, "Resume not found.");
  const [[buf], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
  return { file, resume: JSON.parse(buf.toString("utf-8")) as StoredResume, meta };
}

/** The caller's resumes (newest first) with their count and the cap that applies to them. */
export const resumeList = privateEndpoint(async (body) => {
  const { email, role } = await requireSession(body.cookie, "features:basic");
  const config = readConfig(body.config);
  const [files] = await resumesBucket().getFiles({ prefix: prefixOf(email) });
  const resumes = files
    .filter((f) => f.name.endsWith(".json"))
    .map((f) => ({
      id: f.name.slice(f.name.lastIndexOf("/") + 1, -".json".length),
      title: f.metadata.metadata?.title ?? "Untitled",
      updatedAt: f.metadata.updated ?? null,
      size: Number(f.metadata.size ?? 0),
    }))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return { resumes, cap: canCustomize(role) ? null : config.baseMaxResumes };
});

export const resumeGet = privateEndpoint(async (body) => {
  const { email } = await requireSession(body.cookie, "features:basic");
  const { resume, meta } = await readResume(email, body.id);
  return { resume, generation: String(meta.generation) };
});

/** Creates a resume. The cap is reserved in a transaction so parallel creates cannot exceed it. */
export const resumeCreate = privateEndpoint(async (body) => {
  const { email, role } = await requireSession(body.cookie, "features:basic");
  const config = readConfig(body.config);
  const name = title(body.title);

  let structure: Structure | null = null;
  if (body.structure !== undefined && body.structure !== null) {
    if (!canCustomize(role)) throw new ApiError(400, "Your role uses the default structure.");
    const errors = validateStructure(body.structure, config.rules);
    if (errors.length) problems(errors, "Invalid structure.");
    structure = body.structure as Structure;
  } else if (canCustomize(role)) {
    structure = config.defaultStructure; // advanced users get their own editable copy
  }
  const used = structure ?? config.defaultStructure;
  const data = (body.data ?? emptyData(used)) as unknown;
  const errors = checkDraft(used, data, config.rules);
  if (errors.length) problems(errors, "Invalid resume.");

  const id = randomUUID();
  const now = new Date().toISOString();
  const stored: StoredResume = { id, title: name, structure, data: data as ResumeData, createdAt: now, updatedAt: now };
  const content = JSON.stringify(stored);

  // Reserve a slot first (the cap check lives here), then write the object.
  await db().runTransaction(async (tx) => {
    const ref = ownerRef(email);
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count ?? 0);
    if (!canCustomize(role) && count >= config.baseMaxResumes) {
      throw new ApiError(409, `You can keep at most ${config.baseMaxResumes} resumes. Delete one to create another.`);
    }
    tx.set(
      ref,
      { email, count: count + 1, bytes: FieldValue.increment(content.length), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });

  try {
    await resumeFile(email, id).save(content, {
      contentType: "application/json",
      resumable: false,
      metadata: { metadata: { title: name } },
      preconditionOpts: { ifGenerationMatch: 0 },
    });
  } catch (err) {
    // Give the reserved slot back; the failure is reported to the caller.
    await ownerRef(email).set(
      { count: FieldValue.increment(-1), bytes: FieldValue.increment(-content.length) },
      { merge: true },
    );
    throw err;
  }
  const [meta] = await resumeFile(email, id).getMetadata();
  return { resume: stored, generation: String(meta.generation) };
});

/** Saves a draft. `generation` must match the stored version, so a stale tab cannot overwrite. */
export const resumeSave = privateEndpoint(async (body) => {
  const { email, role } = await requireSession(body.cookie, "features:basic");
  const config = readConfig(body.config);
  const { file, resume, meta } = await readResume(email, body.id);

  if (typeof body.generation !== "string") throw new ApiError(400, "The resume version is required.");
  if (body.generation !== String(meta.generation)) {
    throw new ApiError(409, "This resume changed elsewhere. Reload to continue.");
  }

  let structure = resume.structure;
  if (body.structure !== undefined && body.structure !== null) {
    if (!canCustomize(role)) throw new ApiError(400, "Your role uses the default structure.");
    const errors = validateStructure(body.structure, config.rules);
    if (errors.length) problems(errors, "Invalid structure.");
    structure = body.structure as Structure;
  }
  const used = structure ?? config.defaultStructure;
  const errors = checkDraft(used, body.data, config.rules);
  if (errors.length) problems(errors, "Invalid resume.");

  const next: StoredResume = {
    ...resume,
    title: body.title === undefined ? resume.title : title(body.title),
    structure,
    data: body.data as ResumeData,
    updatedAt: new Date().toISOString(),
  };
  const content = JSON.stringify(next);
  try {
    await file.save(content, {
      contentType: "application/json",
      resumable: false,
      metadata: { metadata: { title: next.title } },
      preconditionOpts: { ifGenerationMatch: Number(body.generation) },
    });
  } catch (err) {
    if (isPreconditionFailed(err)) throw new ApiError(409, "This resume changed elsewhere. Reload to continue.");
    throw err;
  }
  const previousSize = Number(meta.size ?? 0);
  await ownerRef(email).set(
    { email, bytes: FieldValue.increment(content.length - previousSize), updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  const [saved] = await file.getMetadata();
  return { resume: next, generation: String(saved.generation) };
});

/** Deletes a resume. The bucket keeps the old version for 30 days so an operator can restore it. */
export const resumeDelete = privateEndpoint(async (body) => {
  const { email } = await requireSession(body.cookie, "features:basic");
  const { file, meta } = await readResume(email, body.id);
  await file.delete();
  await ownerRef(email).set(
    {
      email,
      count: FieldValue.increment(-1),
      bytes: FieldValue.increment(-Number(meta.size ?? 0)),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { success: true };
});
