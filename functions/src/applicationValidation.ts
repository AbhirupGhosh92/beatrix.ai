import { ApiError } from "./http";
import { checkDraft, type ResumeData, type Structure, type StructureRules } from "./resumeValidation";

// Field checks for job applications. Pure functions: they throw ApiError(400) with the reason and
// return cleaned values, so the handlers stay about storage and ownership.

export interface TrackerLimits {
  statuses: { id: string; label: string }[];
  maxApplications: number;
  maxNotesLength: number;
  maxLabels: number;
  maxLabelLength: number;
  maxTailorBytes: number;
}

export interface TailorContext {
  structure: Structure;
  rules: StructureRules;
}

export interface ApplicationFields {
  company: string;
  role: string;
  jobUrl: string;
  status: string;
  appliedAt: string;
  notes: string;
  labels: string[];
}

export const MAX_COMPANY = 100;
export const MAX_ROLE = 100;
export const MAX_URL = 2000;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const bad = (message: string): never => {
  throw new ApiError(400, message);
};

function requiredText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "") return bad(`${name} is required.`);
  const text = value.trim();
  if (text.length > max) return bad(`${name} must be at most ${max} characters.`);
  return text;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function checkDate(value: unknown): string {
  if (typeof value !== "string" || !DATE.test(value)) return bad("Applied date must be a date (YYYY-MM-DD).");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return bad("Applied date is not a real date.");
  }
  return value;
}

/** Empty is allowed; anything else must be an http or https URL, so `javascript:` is never stored. */
export function checkJobUrl(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return bad("The job posting link must be text.");
  const text = value.trim();
  if (text.length > MAX_URL) return bad(`The job posting link must be at most ${MAX_URL} characters.`);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return bad("The job posting link must be a full http or https URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return bad("The job posting link must start with http or https.");
  return text;
}

export function checkStatus(value: unknown, limits: TrackerLimits): string {
  if (typeof value !== "string" || !limits.statuses.some((s) => s.id === value)) {
    return bad(`Status must be one of: ${limits.statuses.map((s) => s.id).join(", ")}.`);
  }
  return value;
}

export function checkNotes(value: unknown, limits: TrackerLimits): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return bad("Notes must be text.");
  if (value.length > limits.maxNotesLength) return bad(`Notes must be at most ${limits.maxNotesLength} characters.`);
  return value;
}

/** Trimmed, lowercased, de-duplicated; blank entries are dropped. Limits are checked on the result. */
export function checkLabels(value: unknown, limits: TrackerLimits): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return bad("Labels must be a list.");
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return bad("Each label must be text.");
    const label = item.trim().replace(/\s+/g, " ").toLowerCase();
    if (label === "") continue;
    if (label.length > limits.maxLabelLength) return bad(`A label must be at most ${limits.maxLabelLength} characters.`);
    seen.add(label);
  }
  if (seen.size > limits.maxLabels) return bad(`An application can have at most ${limits.maxLabels} labels.`);
  return [...seen];
}

/** The tailor JSON is resume data under the default structure, validated as a draft. */
export function checkTailor(value: unknown, limits: TrackerLimits, ctx: TailorContext): ResumeData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return bad("The tailor JSON must be an object.");
  if (JSON.stringify(value).length > limits.maxTailorBytes) {
    return bad(`The tailor JSON must be at most ${limits.maxTailorBytes} characters.`);
  }
  const errors = checkDraft(ctx.structure, value, ctx.rules);
  if (errors.length) return bad(`Invalid tailor JSON. ${errors.slice(0, 3).join(" ")}`);
  return value as ResumeData;
}

/** All editable fields of a new application (company and role required, the rest defaulted). */
export function checkNew(input: Record<string, unknown>, limits: TrackerLimits): ApplicationFields {
  return {
    company: requiredText(input.company, "Company", MAX_COMPANY),
    role: requiredText(input.role, "Role", MAX_ROLE),
    jobUrl: checkJobUrl(input.jobUrl),
    status: input.status === undefined ? limits.statuses[0].id : checkStatus(input.status, limits),
    appliedAt: input.appliedAt === undefined ? today() : checkDate(input.appliedAt),
    notes: checkNotes(input.notes, limits),
    labels: checkLabels(input.labels, limits),
  };
}

/** Only the fields present in an update are checked and returned. */
export function checkPatch(input: Record<string, unknown>, limits: TrackerLimits): Partial<ApplicationFields> {
  const out: Partial<ApplicationFields> = {};
  if (input.company !== undefined) out.company = requiredText(input.company, "Company", MAX_COMPANY);
  if (input.role !== undefined) out.role = requiredText(input.role, "Role", MAX_ROLE);
  if (input.jobUrl !== undefined) out.jobUrl = checkJobUrl(input.jobUrl);
  if (input.status !== undefined) out.status = checkStatus(input.status, limits);
  if (input.appliedAt !== undefined) out.appliedAt = checkDate(input.appliedAt);
  if (input.notes !== undefined) out.notes = checkNotes(input.notes, limits);
  if (input.labels !== undefined) out.labels = checkLabels(input.labels, limits);
  return out;
}

export function readLimits(value: unknown): TrackerLimits {
  const t = value as Partial<TrackerLimits> | null;
  if (
    !t ||
    typeof t !== "object" ||
    !Array.isArray(t.statuses) ||
    t.statuses.length === 0 ||
    ![t.maxApplications, t.maxNotesLength, t.maxLabels, t.maxLabelLength, t.maxTailorBytes].every(Number.isInteger)
  ) {
    throw new ApiError(500, "Job tracker configuration is unavailable.");
  }
  return t as TrackerLimits;
}
