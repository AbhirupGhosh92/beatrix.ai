import { randomUUID } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { requireSession } from "./auth";
import { blogBucket, db } from "./firebase";
import { ApiError, privateEndpoint } from "./http";
import { docExcerpt, validateDoc, type BlogDoc } from "./blogDoc";
import { can, type Role } from "./policy";
import {
  buildExcerpt,
  checkBody,
  checkContent,
  checkImage,
  checkStatus,
  checkTags,
  checkTitle,
  MAX_PUBLIC_SCAN,
  postId,
  readBlogConfig,
  type BlogConfig,
} from "./blogValidation";
import { createEngagementActions, deleteEngagement } from "./blogEngagement";

/*
 * The whole blog backend is ONE private function, `blog`, that dispatches on `body.action`.
 * Posts are Firestore documents `blog_posts/{postId}`; images are private objects
 * `<postId>/<imageId>` in the `<project id>-blog` bucket. No action trusts the browser: the owner
 * is the email of the verified session cookie, never a request field.
 *
 * Every request:   { action, cookie?, config?, ...fields }
 *   cookie   the user's `__session` cookie (all actions except `headers`)
 *   config   { writeRoles, maxTitleLength, maxBodyLength, maxTagsPerPost, maxTagLength,
 *              maxImageBytes, maxImagesPerPost, maxPostsPerAuthor, excerptLength, maxImageUrlLength } forwarded by the
 *              Next.js server from blog-config.json; re-validated here (a bad key falls back to its
 *              default, an invalid writeRoles to ["admin"], admin is always included). Every text
 *              limit is in characters (Unicode code points). A config that only has the former
 *              byte-based `maxBodyBytes` gets maxBodyLength = that number (capped at 200000).
 * Errors:          HTTP status + { error: { message } }. 400 invalid input or over a limit, 401 no
 *                  or invalid session, 403 role lacks blog:write, 404 a missing, malformed or other
 *                  author's post (non-admin) or image, 409 version conflict or post limit reached.
 *                  An unknown action is 400.
 *
 * Types
 *   Image   = { id, contentType: "image/png"|"image/jpeg"|"image/webp"|"image/gif", bytes, name }
 *   Post    = { id, title, format: "markdown"|"doc", body, content? (the rich-text document, only
 *               when format is "doc"; body is then the original Markdown, "" for a new post),
 *               tags: string[], images: Image[], status: "draft"|"published",
 *               excerpt, version, createdAt, updatedAt, publishedAt: string|null,
 *               authorEmail?  (present only when the caller is admin) }   (ISO timestamps)
 *   Summary = { id, title, excerpt, tags, status, imageCount, version, createdAt, updatedAt,
 *               publishedAt: string|null, authorEmail? (only for admin with scope "all") }
 *
 * list         { scope?: "own"|"all" }                        -> { posts: Summary[], canSeeAll: boolean }
 *              newest updated first; "all" is honored only for admin, otherwise the caller's own.
 * get          { id }                                         -> { post: Post }
 * save         { id?, title, content | body, tags?, status, version?, removeImageIds? }
 *              `content` = rich-text document (validated against the closed schema in blogDoc.ts,
 *              stored with format "doc", excerpt built from its text; the original `body` of an
 *              earlier Markdown post is kept untouched). `body` = legacy Markdown string (the old
 *              app during a rollout); refused with 409 for a post already saved as a document.
 *              no id = create (status/limits checked, maxPostsPerAuthor -> 409; version ignored);
 *              with id = update, `version` (number from the last read) REQUIRED, mismatch -> 409.
 *              removeImageIds: images to drop (deleted from the bucket). Returns -> { post: Post }
 *              (version is +1 after an update; 1 after a create). The admin keeps the original author.
 * delete       { id }                                         -> { success: true } (images deleted too)
 * imageUpload  { id, name, dataBase64 }                       -> { image: Image, images: Image[] }
 *              type from magic bytes (PNG/JPEG/WebP/GIF only), size and count limits; does not bump
 *              the post version.
 * imageGet     { id, imageId }                                -> { contentType, name, dataBase64 }
 *              the image must belong to the post (else 404); same ownership check as the post.
 * headers      {} (no cookie)                                 -> { headers: [{ id, title, excerpt,
 *              tags, publishedAt, authorName }] } published posts only, newest first, at most 500.
 * publicGet    { id } (no cookie)                             -> { post: { id, title, excerpt, tags,
 *              publishedAt, authorName, format, body (markdown) | content (doc), images:
 *              [{ id, name, contentType }] } } published posts only; a draft, deleted, unknown or
 *              malformed id is the same 404.
 * publicImageGet { id, imageId } (no cookie)                  -> { contentType, name, dataBase64 }
 *              the post must be published and own the image, else 404.
 *
 * Engagement (blogEngagement.ts; published posts only, anything else is the same 404 as publicGet).
 * Identity is always the verified session email; `site:view` is enough (not blog:write). The config
 * also carries maxCommentLength, maxCommentsShown, maxCommentsPerUserPerPost, maxCommentsPerPost and
 * maxBookmarksPerUser. Over a per-user rate limit (30 writes/min, 5 comments/10 min) -> 429.
 * engagementGet  { id, before?, cookie? }   -> { likeCount, commentCount, comments: [{ id, authorName,
 *              text, createdAt, mine, canRemove }], hasMore, viewer: null | { liked, bookmarked } }
 *              newest comments first; no or invalid cookie = anonymous (viewer null).
 * likeToggle     { id }                     -> { liked, likeCount }
 * bookmarkToggle { id }                     -> { bookmarked }  (409 past maxBookmarksPerUser)
 * bookmarksList  {}                         -> { posts: [{ id, title, excerpt, tags, publishedAt,
 *              authorName, savedAt }] } newest saved first; unpublished or deleted posts dropped.
 * commentAdd     { id, text }               -> { comment, commentCount }  (400 empty or too long,
 *              409 comment limit)
 * commentRemove  { id, commentId }          -> { commentCount }  (writer, post author or admin;
 *              403 otherwise, 404 missing)
 * Deleting a post also deletes its engagement data; unpublishing keeps it.
 *              The public actions build their output from explicit field lists; the author email is
 *              never returned, `authorName` is the author's display name limited to 60 characters
 *              ("Author" when empty or containing "@").
 */

const POSTS = "blog_posts";

interface StoredImage {
  id: string;
  contentType: string;
  bytes: number;
  name: string;
}

interface StoredPost {
  authorEmail: string;
  title: string;
  body: string;
  format?: "doc";
  content?: BlogDoc;
  tags: string[];
  images: StoredImage[];
  status: "draft" | "published";
  excerpt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

type Body = Record<string, unknown>;

const postRef = (id: string) => db().doc(`${POSTS}/${id}`);

/** Session check, then the config-driven `blog:write` check (requireSession cannot take the roles). */
async function authorize(body: Body): Promise<{ email: string; role: Role; config: BlogConfig }> {
  const config = readBlogConfig(body.config);
  const { email, role } = await requireSession(body.cookie, "site:view");
  if (!can(role, "blog:write", { blogWriteRoles: config.writeRoles })) throw new ApiError(403, "Not allowed.");
  return { email, role, config };
}

/** Missing, malformed or someone else's (caller not admin) are indistinguishable: 404. */
function visible(data: StoredPost | undefined, email: string, role: Role): StoredPost {
  if (!data || (data.authorEmail !== email && role !== "admin")) throw new ApiError(404, "Post not found.");
  return data;
}

async function loadPost(id: string, email: string, role: Role) {
  const ref = postRef(id);
  const snap = await ref.get();
  return { ref, post: visible(snap.exists ? (snap.data() as StoredPost) : undefined, email, role) };
}

function publicPost(id: string, p: StoredPost, role: Role) {
  const out: Record<string, unknown> = {
    id,
    title: p.title,
    format: p.format === "doc" ? "doc" : "markdown",
    body: p.body,
    ...(p.format === "doc" && p.content ? { content: p.content } : {}),
    tags: p.tags,
    images: p.images,
    status: p.status,
    excerpt: p.excerpt,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    publishedAt: p.publishedAt,
  };
  if (role === "admin") out.authorEmail = p.authorEmail;
  return out;
}

function summary(id: string, p: StoredPost, withAuthor: boolean) {
  const out: Record<string, unknown> = {
    id,
    title: p.title,
    excerpt: p.excerpt,
    tags: p.tags,
    status: p.status,
    imageCount: p.images?.length ?? 0,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    publishedAt: p.publishedAt ?? null,
  };
  if (withAuthor) out.authorEmail = p.authorEmail;
  return out;
}

const imageFile = (post: string, image: string) => blogBucket().file(`${post}/${image}`);

async function list(body: Body) {
  const { email, role } = await authorize(body);
  const all = role === "admin" && body.scope === "all";
  const snap = await (all
    ? db().collection(POSTS).get()
    : db().collection(POSTS).where("authorEmail", "==", email).get());
  const posts = snap.docs
    .map((d) => ({ id: d.id, data: d.data() as StoredPost }))
    .sort((a, b) => String(b.data.updatedAt).localeCompare(String(a.data.updatedAt)))
    .map((p) => summary(p.id, p.data, all));
  return { posts, canSeeAll: role === "admin" };
}

async function get(body: Body) {
  const { email, role } = await authorize(body);
  const id = postId(body.id);
  const { post } = await loadPost(id, email, role);
  return { post: publicPost(id, post, role) };
}

async function save(body: Body) {
  const { email, role, config } = await authorize(body);
  const title = checkTitle(body.title, config);
  const rich = body.content !== undefined && body.content !== null;
  const checked = rich ? checkContent(body.content, config) : undefined;
  const text = checked ? "" : checkBody(body.body, config);
  const tags = checkTags(body.tags, config);
  const status = checkStatus(body.status);
  const excerpt = checked ? docExcerpt(checked.doc, config.excerptLength) : buildExcerpt(text, config.excerptLength);
  const now = new Date().toISOString();

  if (body.id === undefined || body.id === null) {
    const count = (await db().collection(POSTS).where("authorEmail", "==", email).count().get()).data().count;
    if (count >= config.maxPostsPerAuthor) {
      throw new ApiError(409, `You can keep at most ${config.maxPostsPerAuthor} posts. Delete one to create another.`);
    }
    const id = randomUUID();
    const stored: StoredPost = {
      authorEmail: email,
      title,
      body: text,
      ...(checked ? { format: "doc" as const, content: checked.doc } : {}),
      tags,
      images: [],
      status,
      excerpt,
      version: 1,
      createdAt: now,
      updatedAt: now,
      publishedAt: status === "published" ? now : null,
    };
    await postRef(id).create(stored);
    return { post: publicPost(id, stored, role) };
  }

  const id = postId(body.id);
  if (typeof body.version !== "number" || !Number.isInteger(body.version)) {
    throw new ApiError(400, "The post version is required.");
  }
  const expected = body.version;
  const remove = Array.isArray(body.removeImageIds)
    ? new Set((body.removeImageIds as unknown[]).filter((v): v is string => typeof v === "string"))
    : new Set<string>();

  let removed: string[] = [];
  const next = await db().runTransaction(async (tx) => {
    const ref: DocumentReference = postRef(id);
    const snap = await tx.get(ref);
    const current = visible(snap.exists ? (snap.data() as StoredPost) : undefined, email, role);
    if (current.version !== expected) throw new ApiError(409, "This post changed elsewhere. Reload to continue.");
    if (!checked && current.format === "doc") {
      throw new ApiError(409, "This post was saved with the new editor. Reload to continue.");
    }
    removed = current.images.filter((i) => remove.has(i.id)).map((i) => i.id);
    const updated: StoredPost = {
      ...current, // authorEmail stays the original author, also for the admin
      title,
      // A rich save keeps the original Markdown body as a rollback copy.
      ...(checked ? { format: "doc" as const, content: checked.doc } : { body: text }),
      tags,
      images: current.images.filter((i) => !remove.has(i.id)),
      status,
      excerpt,
      version: current.version + 1,
      updatedAt: now,
      publishedAt: status === "published" ? (current.publishedAt ?? now) : null,
    };
    tx.set(ref, updated);
    return updated;
  });
  await Promise.all(removed.map((imageId) => imageFile(id, imageId).delete({ ignoreNotFound: true })));
  return { post: publicPost(id, next, role) };
}

async function remove(body: Body) {
  const { email, role } = await authorize(body);
  const id = postId(body.id);
  const { ref } = await loadPost(id, email, role);
  await ref.delete();
  // The bucket keeps noncurrent versions for 30 days, so an operator can still restore an image.
  await blogBucket().deleteFiles({ prefix: `${id}/`, force: true });
  await deleteEngagement(id);
  return { success: true };
}

async function imageUpload(body: Body) {
  const { email, role, config } = await authorize(body);
  const id = postId(body.id);
  const { post } = await loadPost(id, email, role);
  if (post.images.length >= config.maxImagesPerPost) {
    throw new ApiError(400, `A post can have at most ${config.maxImagesPerPost} images.`);
  }
  const upload = checkImage(body.dataBase64, body.name, config);
  const image: StoredImage = {
    id: randomUUID(),
    contentType: upload.contentType,
    bytes: upload.bytes.length,
    name: upload.name,
  };
  await imageFile(id, image.id).save(upload.bytes, {
    contentType: image.contentType,
    resumable: false,
    preconditionOpts: { ifGenerationMatch: 0 },
  });
  try {
    // Touches only images[] (version unchanged), re-checking existence, ownership and the count.
    const images = await db().runTransaction(async (tx) => {
      const ref = postRef(id);
      const snap = await tx.get(ref);
      const current = visible(snap.exists ? (snap.data() as StoredPost) : undefined, email, role);
      if (current.images.length >= config.maxImagesPerPost) {
        throw new ApiError(400, `A post can have at most ${config.maxImagesPerPost} images.`);
      }
      const list = [...current.images, image];
      tx.update(ref, { images: list, updatedAt: new Date().toISOString() });
      return list;
    });
    return { image, images };
  } catch (err) {
    await imageFile(id, image.id).delete({ ignoreNotFound: true });
    throw err;
  }
}

async function imageGet(body: Body) {
  const { email, role } = await authorize(body);
  const id = postId(body.id);
  const { post } = await loadPost(id, email, role);
  const image = typeof body.imageId === "string" ? post.images.find((i) => i.id === body.imageId) : undefined;
  if (!image) throw new ApiError(404, "Image not found.");
  const [bytes] = await imageFile(id, image.id).download();
  return { contentType: image.contentType, name: image.name, dataBase64: bytes.toString("base64") };
}

const USERS = "allowed_emails";
const AUTHOR_FALLBACK = "Author";
const AUTHOR_MAX = 60;

/** A display name that is safe to show: trimmed, at most 60 characters, never an email address. */
function authorNameOf(raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name === "" || name.includes("@")) return AUTHOR_FALLBACK;
  return Array.from(name).slice(0, AUTHOR_MAX).join("").trim();
}

/** Display names of the given authors from `allowed_emails/{email}.displayName` (one batched read). */
async function authorNames(emails: string[]): Promise<Map<string, string>> {
  const distinct = Array.from(new Set(emails));
  const names = new Map<string, string>();
  if (distinct.length === 0) return names;
  const snaps = await db().getAll(...distinct.map((e) => db().doc(`${USERS}/${e}`)));
  snaps.forEach((snap, i) => names.set(distinct[i], authorNameOf(snap.exists ? snap.get("displayName") : undefined)));
  return names;
}

/**
 * Public read of the headers of published posts. One single-field query (range plus order on
 * `publishedAt`, which unpublished posts have as null), so no composite index is needed. The author
 * email is read only to resolve the display name and is never part of the answer.
 */
async function headers() {
  const snap = await db()
    .collection(POSTS)
    .where("publishedAt", ">", "")
    .orderBy("publishedAt", "desc")
    .limit(MAX_PUBLIC_SCAN)
    .select("title", "excerpt", "tags", "publishedAt", "status", "authorEmail")
    .get();
  const published = snap.docs.filter((d) => d.get("status") === "published");
  const names = await authorNames(published.map((d) => String(d.get("authorEmail") ?? "")).filter(Boolean));
  return {
    headers: published.map((d) => ({
      id: d.id,
      title: d.get("title"),
      excerpt: d.get("excerpt"),
      tags: d.get("tags") ?? [],
      publishedAt: d.get("publishedAt"),
      authorName: names.get(String(d.get("authorEmail") ?? "")) ?? AUTHOR_FALLBACK,
    })),
  };
}

/** A published post by id; anything else (draft, deleted, unknown, malformed) is the same 404. */
async function loadPublished(rawId: unknown): Promise<{ id: string; post: StoredPost }> {
  const id = postId(rawId);
  const snap = await postRef(id).get();
  const post = snap.exists ? (snap.data() as StoredPost) : undefined;
  if (!post || post.status !== "published" || !post.publishedAt) throw new ApiError(404, "Post not found.");
  return { id, post };
}

async function publicGet(body: Body) {
  const { id, post } = await loadPublished(body.id);
  const name = (await authorNames([post.authorEmail])).get(post.authorEmail) ?? AUTHOR_FALLBACK;
  const doc = post.format === "doc" && post.content ? validateDoc(post.content, { maxImageUrlLength: readBlogConfig(body.config).maxImageUrlLength }) : undefined;
  return {
    post: {
      id,
      title: post.title,
      excerpt: post.excerpt,
      tags: post.tags ?? [],
      publishedAt: post.publishedAt,
      authorName: name,
      format: doc ? "doc" : "markdown",
      ...(doc ? { content: doc } : { body: post.body }),
      images: (post.images ?? []).map((i) => ({ id: i.id, name: i.name, contentType: i.contentType })),
    },
  };
}

async function publicImageGet(body: Body) {
  const { id, post } = await loadPublished(body.id);
  const image = typeof body.imageId === "string" ? post.images.find((i) => i.id === body.imageId) : undefined;
  if (!image) throw new ApiError(404, "Image not found.");
  const [bytes] = await imageFile(id, image.id).download();
  return { contentType: image.contentType, name: image.name, dataBase64: bytes.toString("base64") };
}

const engagement = createEngagementActions({ loadPublished, authorNames, authorFallback: AUTHOR_FALLBACK });

const ACTIONS: Record<string, (body: Body) => Promise<unknown>> = {
  list,
  get,
  save,
  delete: remove,
  imageUpload,
  imageGet,
  headers: () => headers(),
  publicGet,
  publicImageGet,
  ...engagement,
};

export const blog = privateEndpoint(async (body) => {
  const action = typeof body.action === "string" ? body.action : "";
  if (!Object.prototype.hasOwnProperty.call(ACTIONS, action)) throw new ApiError(400, "Unknown action.");
  return ACTIONS[action](body);
});
