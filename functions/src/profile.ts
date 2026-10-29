import { cmsFile, PROFILE_FILE, readText } from "./cms";
import { privateEndpoint } from "./http";

/** Server-only: the site's profile JSON (null content when none has been saved yet). */
export const getProfile = privateEndpoint(async () => {
  const file = cmsFile(PROFILE_FILE);
  const [exists] = await file.exists();
  if (!exists) return { content: null, updatedAt: null };
  const [meta] = await file.getMetadata();
  return { content: await readText(file), updatedAt: meta.updated ?? null };
});
