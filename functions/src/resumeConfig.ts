import { cmsFile, readText, RESUME_CONFIG_FILE } from "./cms";
import { privateEndpoint } from "./http";

/** Server-only: the resume builder's config JSON (null content when none has been saved yet). */
export const getResumeConfig = privateEndpoint(async () => {
  const file = cmsFile(RESUME_CONFIG_FILE);
  const [exists] = await file.exists();
  if (!exists) return { content: null, updatedAt: null };
  const [meta] = await file.getMetadata();
  return { content: await readText(file), updatedAt: meta.updated ?? null };
});
