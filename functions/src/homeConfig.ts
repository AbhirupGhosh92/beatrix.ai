import { cmsFile, HOME_CONFIG_FILE, readText } from "./cms";
import { privateEndpoint } from "./http";

/** Server-only: the landing page config JSON (null content when none has been saved yet). */
export const getHomeConfig = privateEndpoint(async () => {
  const file = cmsFile(HOME_CONFIG_FILE);
  const [exists] = await file.exists();
  if (!exists) return { content: null, updatedAt: null };
  const [meta] = await file.getMetadata();
  return { content: await readText(file), updatedAt: meta.updated ?? null };
});
