import { randomUUID } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { requireSession } from "./auth";
import { blogBucket, db } from "./firebase";
import { ApiError, privateEndpoint } from "./http";
import { can, type Role } from "./policy";
import {
  buildExcerpt,
  checkBody,
  checkImage,
  checkStatus,
  checkTags,
  checkTitle,
  MAX_PUBLIC_SCAN,
  postId,
  readBlogConfig,
  type BlogConfig,
} from "./blogValidation";

/*
 * The whole blog backend is ONE private function, `blog`, that dispatches on `body.action`.
 * Posts are Firestore documents `blog_posts/{postId}`; images are private objects
 * `<postId>/<imageId>` in the `<project id>-blog` bucket. No action trusts the browser: the owner
 * is the email of the verified session cookie, never a request field.
 *
 * Every request:   { action, cookie?, config?, ...fields }
 *   cookie   the user's `__session` cookie (all actions except `headers`)
 *   config   { writeRoles, maxTitleLength, maxBodyBytes, maxTagsPerPost, maxTagLength,
 *              maxImageBytes, maxImagesPerPost, maxPostsPerAuthor, excerptLength } forwarded by the
 *              Next.js server from blog-config.json; re-validated here (a bad key falls back to its
 *              default, an invalid writeRoles to ["admin"], admin is always included).
 * Errors:          HTTP status + { error: { message } }. 400 invalid input or over a limit, 401 no
 *                  or invalid session, 403 role lacks blog:write, 404 a missing, malformed or other
 *                  author's post (non-admin) or image, 409 version conflict or post limit reached.
 *                  An unknown action is 400.
 *
 * Types
 *   Image   = { id, contentType: "image/png"|"image/jpeg"|"image/webp"|"image/gif", bytes, name }
 *   Post    = { id, title, body, tags: string[], images: Image[], status: "draft"|"published",
 *               excerpt, version, createdAt, updatedAt, publishedAt: string|null,
 *               authorEmail?  (present only when the caller is admin) }   (ISO timestamps)
 *   Summary = { id, title, excerpt, tags, status, imageCount, version, createdAt, updatedAt,
 *               publishedAt: string|null, authorEmail? (only for admin with scope "all") }
 *
 * list         { scope?: "own"|"all" }                        -> { posts: Summary[], canSeeAll: boolean }
 *              newest updated first; "all" is honored only for admin, otherwise the caller's own.
 * get          { id }                                         -> { post: Post }
 * save         { id?, title, body, tags?, status, version?, removeImageIds? }
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
 *              tags, publishedAt }] } published posts only, newest first, at most 500; never the
 *              author email, body, image ids or draft state.
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
    body: p.body,
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
  const text = checkBody(body.body, config);
  const tags = checkTags(body.tags, config);
  const status = checkStatus(body.status);
  const excerpt = buildExcerpt(text, config.excerptLength);
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
    removed = current.images.filter((i) => remove.has(i.id)).map((i) => i.id);
    const updated: StoredPost = {
      ...current, // authorEmail stays the original author, also for the admin
      title,
      body: text,
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

/**
 * The one public read: headers of published posts, nothing else. One single-field query (range plus
 * order on `publishedAt`, which unpublished posts have as null), so no composite index is needed.
 */
async function headers() {
  const snap = await db()
    .collection(POSTS)
    .where("publishedAt", ">", "")
    .orderBy("publishedAt", "desc")
    .limit(MAX_PUBLIC_SCAN)
    .select("title", "excerpt", "tags", "publishedAt", "status")
    .get();
  return {
    headers: snap.docs
      .filter((d) => d.get("status") === "published")
      .map((d) => ({
        id: d.id,
        title: d.get("title"),
        excerpt: d.get("excerpt"),
        tags: d.get("tags") ?? [],
        publishedAt: d.get("publishedAt"),
      })),
  };
}

const ACTIONS: Record<string, (body: Body) => Promise<unknown>> = {
  list,
  get,
  save,
  delete: remove,
  imageUpload,
  imageGet,
  headers: () => headers(),
};

export const blog = privateEndpoint(async (body) => {
  const action = typeof body.action === "string" ? body.action : "";
  if (!Object.prototype.hasOwnProperty.call(ACTIONS, action)) throw new ApiError(400, "Unknown action.");
  return ACTIONS[action](body);
});
