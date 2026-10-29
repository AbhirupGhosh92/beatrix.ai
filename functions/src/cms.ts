import { ApiError } from "./http";
import { bucket, type StorageFile } from "./firebase";

/** Editable JSON files live under this prefix of the default Storage bucket. */
const CMS_PREFIX = "cms/";
const BACKUP_PREFIX = "cms-backups/";
const FILE_NAME = /^[a-zA-Z0-9_-]+\.json$/;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const PROFILE_FILE = "profile.json";

export interface FileInfo {
  filename: string;
  displayName: string;
  exists: boolean;
  size: number;
  updatedAt: string | null;
}

export function cmsFile(name: unknown): StorageFile {
  if (typeof name !== "string" || !FILE_NAME.test(name)) {
    throw new ApiError(400, "Invalid file name (use letters, digits, - or _ and .json).");
  }
  return bucket().file(CMS_PREFIX + name);
}

export async function fileInfo(file: StorageFile, filename: string): Promise<FileInfo> {
  const displayName = filename === PROFILE_FILE ? "profile.json (Active Profile)" : filename;
  const [exists] = await file.exists();
  if (!exists) return { filename, displayName, exists: false, size: 0, updatedAt: null };
  const [meta] = await file.getMetadata();
  return {
    filename,
    displayName,
    exists: true,
    size: Number(meta.size ?? 0),
    updatedAt: meta.updated ?? null,
  };
}

export async function listFiles(): Promise<FileInfo[]> {
  const [files] = await bucket().getFiles({ prefix: CMS_PREFIX });
  const found = files
    .map((f) => f.name.slice(CMS_PREFIX.length))
    .filter((name) => FILE_NAME.test(name));
  const names = Array.from(new Set([PROFILE_FILE, ...found]));
  return Promise.all(names.map((name) => fileInfo(cmsFile(name), name)));
}

export async function readText(file: StorageFile): Promise<string> {
  const [buf] = await file.download();
  return buf.toString("utf-8");
}

/** Keeps the previous version under cms-backups/ before it is overwritten. */
export async function backup(file: StorageFile, filename: string): Promise<void> {
  const [exists] = await file.exists();
  if (!exists) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await file.copy(bucket().file(`${BACKUP_PREFIX}${filename}.${stamp}`));
}
