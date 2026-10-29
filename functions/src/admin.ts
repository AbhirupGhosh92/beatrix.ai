import { ApiError, privateEndpoint } from "./http";
import { requireAdmin } from "./auth";
import { backup, cmsFile, fileInfo, listFiles, MAX_FILE_BYTES, readText } from "./cms";

// Every handler first calls requireAdmin(), which rejects anyone who is not signed in with a
// whitelisted email flagged admin: true (on top of the IAM restriction to the site's server).

/** Admin: the editable JSON files and their metadata. */
export const adminListFiles = privateEndpoint(async (body) => {
  await requireAdmin(body.idToken);
  return { files: await listFiles() };
});

/** Admin: one file's content (empty when it does not exist yet). */
export const adminGetFile = privateEndpoint(async (body) => {
  await requireAdmin(body.idToken);
  const filename = body.file as string;
  const file = cmsFile(filename);
  const info = await fileInfo(file, filename);
  return { ...info, content: info.exists ? await readText(file) : "" };
});

/** Admin: validates and saves a JSON file, backing up the previous version first. */
export const adminSaveFile = privateEndpoint(async (body) => {
  const email = await requireAdmin(body.idToken);
  const filename = body.file as string;
  const file = cmsFile(filename);
  const { content } = body;

  if (typeof content !== "string") throw new ApiError(400, "Content must be a string.");
  if (Buffer.byteLength(content, "utf-8") > MAX_FILE_BYTES) {
    throw new ApiError(400, "Payload exceeds maximum allowed size (5MB).");
  }
  try {
    JSON.parse(content);
  } catch (err) {
    throw new ApiError(400, `JSON Parse Error: ${err instanceof Error ? err.message : "invalid JSON"}`);
  }

  await backup(file, filename);
  await file.save(content, { contentType: "application/json", resumable: false });
  const info = await fileInfo(file, filename);
  return { success: true, message: `Saved ${filename} to Firebase Storage`, savedBy: email, ...info };
});
