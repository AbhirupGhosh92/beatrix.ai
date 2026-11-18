import { ApiError } from "./http";
import { ROLES, type Role } from "./policy";
import { charCount, docText, validateDoc, type BlogDoc } from "./blogDoc";

// Blog input rules. The limits come from blog-config.json through the Next.js server; they are
// re-validated here (a bad or missing value falls back to the default, never to "unlimited") and
// are also capped by fixed maxima in code.

export interface BlogLimits {
  maxTitleLength: number;
  maxBodyLength: number;
  maxTagsPerPost: number;
  maxTagLength: number;
  maxImageBytes: number;
  maxImagesPerPost: number;
  maxPostsPerAuthor: number;
  excerptLength: number;
}

export interface BlogConfig extends BlogLimits {
  writeRoles: Role[];
}

export const BLOG_DEFAULTS: BlogConfig = {
  writeRoles: ["admin"],
  maxTitleLength: 120,
  maxBodyLength: 50_000,
  maxTagsPerPost: 8,
  maxTagLength: 30,
  maxImageBytes: 2_097_152,
  maxImagesPerPost: 10,
  maxPostsPerAuthor: 200,
  excerptLength: 160,
};

/** Hard caps in code that a config can never raise. */
export const BLOG_HARD_MAX = {
  maxBodyLength: 200_000,
  maxImageBytes: 5_242_880,
  maxTitleLength: 300,
  maxTagsPerPost: 30,
  maxTagLength: 60,
  maxImagesPerPost: 50,
  maxPostsPerAuthor: 5000,
  excerptLength: 500,
} as const;

/** Serialized size of a stored document; far below Firestore's 1 MiB document limit. */
export const MAX_DOC_BYTES = 700_000;

/** The most recently published posts the public headers read considers. */
export const MAX_PUBLIC_SCAN = 500;

const INT_KEYS = [
  "maxTitleLength",
  "maxBodyLength",
  "maxTagsPerPost",
  "maxTagLength",
  "maxImageBytes",
  "maxImagesPerPost",
  "maxPostsPerAuthor",
  "excerptLength",
] as const;

/** Reads the forwarded config; an invalid key falls back to its default, writeRoles to admin only. */
export function readBlogConfig(value: unknown): BlogConfig {
  const c = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out: BlogConfig = { ...BLOG_DEFAULTS, writeRoles: ["admin"] };
  for (const key of INT_KEYS) {
    const v = c[key];
    if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= BLOG_HARD_MAX[key]) out[key] = v;
  }
  // Legacy byte-based key: a character is at least one byte, so it is a safe (never stricter) limit.
  const legacy = c.maxBodyBytes;
  const lengthValid =
    typeof c.maxBodyLength === "number" &&
    Number.isInteger(c.maxBodyLength) &&
    c.maxBodyLength >= 1 &&
    c.maxBodyLength <= BLOG_HARD_MAX.maxBodyLength;
  if (!lengthValid && typeof legacy === "number" && Number.isInteger(legacy) && legacy >= 1) {
    out.maxBodyLength = Math.min(legacy, BLOG_HARD_MAX.maxBodyLength);
  }
  const roles = c.writeRoles;
  if (Array.isArray(roles) && roles.every((r) => typeof r === "string" && (ROLES as readonly string[]).includes(r))) {
    out.writeRoles = Array.from(new Set<Role>(["admin", ...(roles as Role[])]));
  }
  return out;
}

export const POST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A malformed id can never match a post, so it is a 404 like a missing one. */
export function postId(value: unknown): string {
  if (typeof value !== "string" || !POST_ID.test(value)) throw new ApiError(404, "Post not found.");
  return value;
}

export function checkTitle(value: unknown, limits: BlogLimits): string {
  if (typeof value !== "string" || value.trim() === "" || charCount(value.trim()) > limits.maxTitleLength) {
    throw new ApiError(400, `Title must be 1-${limits.maxTitleLength} characters.`);
  }
  return value.trim();
}

/** Legacy Markdown body: counted in characters (code points). */
export function checkBody(value: unknown, limits: BlogLimits): string {
  if (typeof value !== "string") throw new ApiError(400, "The post body must be text.");
  if (charCount(value) > limits.maxBodyLength) {
    throw new ApiError(400, `The post body is over the limit of ${limits.maxBodyLength} characters.`);
  }
  return value;
}

/** Rich-text document: closed schema, size backstop, visible text counted in characters. */
export function checkContent(value: unknown, limits: BlogLimits): { doc: BlogDoc; text: string } {
  let doc: BlogDoc;
  try {
    doc = validateDoc(value);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : "The post content is not valid.");
  }
  if (Buffer.byteLength(JSON.stringify(doc), "utf-8") > MAX_DOC_BYTES) {
    throw new ApiError(400, "The post is too large to store");
  }
  const text = docText(doc);
  if (charCount(text) > limits.maxBodyLength) {
    throw new ApiError(400, `The post body is over the limit of ${limits.maxBodyLength} characters.`);
  }
  return { doc, text };
}

/** Trimmed, lowercased, de-duplicated; empty entries dropped. */
export function checkTags(value: unknown, limits: BlogLimits): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((t) => typeof t !== "string")) {
    throw new ApiError(400, "Tags must be a list of text values.");
  }
  const tags = Array.from(new Set((value as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean)));
  if (tags.length > limits.maxTagsPerPost) {
    throw new ApiError(400, `A post can have at most ${limits.maxTagsPerPost} tags.`);
  }
  if (tags.some((t) => charCount(t) > limits.maxTagLength)) {
    throw new ApiError(400, `A tag can have at most ${limits.maxTagLength} characters.`);
  }
  return tags;
}

export function checkStatus(value: unknown): "draft" | "published" {
  if (value !== "draft" && value !== "published") throw new ApiError(400, "Status must be draft or published.");
  return value;
}

/** Plain-text excerpt: Markdown syntax stripped, whitespace collapsed, cut at a word where possible. */
export function buildExcerpt(markdown: string, length: number): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~`#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(text);
  if (chars.length <= length) return text;
  const cut = chars.slice(0, length);
  const space = cut.lastIndexOf(" ");
  return `${(space > length * 0.6 ? cut.slice(0, space) : cut).join("").trimEnd()}…`;
}

export type ImageType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/** Detects the type from the magic bytes; the type the client claims is ignored. Null = unsupported (SVG included). */
export function detectImageType(b: Buffer): ImageType | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (b.length >= 6 && (b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a")) {
    return "image/gif";
  }
  return null;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Decodes and checks an uploaded image against the size limit and the allowed types. */
export function checkImage(dataBase64: unknown, name: unknown, limits: BlogLimits) {
  if (typeof dataBase64 !== "string" || dataBase64 === "" || !BASE64.test(dataBase64)) {
    throw new ApiError(400, "The image data is missing or not valid base64.");
  }
  // Reject before decoding when the encoded size already exceeds the limit.
  if (dataBase64.length > Math.ceil(limits.maxImageBytes / 3) * 4) {
    throw new ApiError(400, `The image is over the limit of ${limits.maxImageBytes} bytes.`);
  }
  const bytes = Buffer.from(dataBase64, "base64");
  if (bytes.length > limits.maxImageBytes) {
    throw new ApiError(400, `The image is over the limit of ${limits.maxImageBytes} bytes.`);
  }
  const contentType = detectImageType(bytes);
  if (!contentType) throw new ApiError(400, "Only PNG, JPEG, WebP and GIF images are allowed.");
  const label = typeof name === "string" ? name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 100) : "";
  return { bytes, contentType, name: label || "image" };
}
