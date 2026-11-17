import { ApiError, privateEndpoint } from "./http";
import { cmsFile, CONFIG_FILES, readText } from "./cms";

/**
 * Server-only: one of the site's public config JSON files, named by `file` (null content when it has
 * not been saved yet). The file name must be one of CONFIG_FILES; any other name is refused, so this
 * cannot be used to read the other CMS files.
 */
export const getConfig = privateEndpoint(async (body) => {
  const name = body.file;
  if (typeof name !== "string" || !(CONFIG_FILES as readonly string[]).includes(name)) {
    throw new ApiError(400, "Unknown config file.");
  }
  const file = cmsFile(name);
  const [exists] = await file.exists();
  if (!exists) return { content: null, updatedAt: null };
  const [meta] = await file.getMetadata();
  return { content: await readText(file), updatedAt: meta.updated ?? null };
});
