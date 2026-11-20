import { createHash, randomUUID } from "node:crypto";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { requireSession } from "./auth";
import { charCount } from "./blogDoc";
import { db } from "./firebase";
import { ApiError } from "./http";
import type { Role } from "./policy";
import { postId, readBlogConfig } from "./blogValidation";

/*
 * Engagement (likes, bookmarks, comments) for published posts, served by the `blog` function
 * (actions are registered in blog.ts; see the header comment there for the contract).
 *
 * Firestore (written only here, through the Admin SDK):
 *   blog_engagement/{postId}                    { likeCount, commentCount, updatedAt }
 *   blog_engagement/{postId}/likes/{userKey}    { createdAt }
 *   blog_engagement/{postId}/comments/{id}      { authorEmail (private), text, createdAt }
 *   blog_bookmarks/{userKey}/posts/{postId}     { createdAt }
 *   blog_rate/{userKey}                         { w, n, cw, cn }  (fixed rate-limit windows)
 * userKey = sha256(lowercase email), so no document id is an email. Counters change in the same
 * transaction as the write they count. The author email and the user key never leave this module.
 */

export const ENGAGEMENT = "blog_engagement";
export const BOOKMARKS = "blog_bookmarks";
const RATE = "blog_rate";

/** Rate limits per verified user. Constants on purpose: an editable limit could switch them off. */
export const RATE_LIMITS = {
  writeWindowMs: 60_000,
  writesPerWindow: 30,
  commentWindowMs: 600_000,
  commentsPerWindow: 5,
} as const;

export const RATE_MESSAGE = "Too many actions. Try again in a minute.";

export interface RateState {
  w: number;
  n: number;
  cw: number;
  cn: number;
}

/**
 * Pure fixed-window step. Counts one write (and one comment when `comment`) at `now` (ms) and
 * returns the new state; throws 429 when either window is already full. A window that has passed
 * starts again at 1.
 */
export function nextRate(prev: Partial<RateState> | undefined, now: number, comment: boolean): RateState {
  const w = Math.floor(now / RATE_LIMITS.writeWindowMs) * RATE_LIMITS.writeWindowMs;
  const cw = Math.floor(now / RATE_LIMITS.commentWindowMs) * RATE_LIMITS.commentWindowMs;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const n = prev?.w === w ? num(prev?.n) : 0;
  const cn = prev?.cw === cw ? num(prev?.cn) : 0;
  if (n >= RATE_LIMITS.writesPerWindow) throw new ApiError(429, RATE_MESSAGE);
  if (comment && cn >= RATE_LIMITS.commentsPerWindow) throw new ApiError(429, RATE_MESSAGE);
  return { w, n: n + 1, cw, cn: comment ? cn + 1 : cn };
}

export const userKeyOf = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

/** NFC, control characters other than \n removed, 3+ newlines collapsed to 2, trimmed; then checked. */
export function cleanComment(value: unknown, maxLength: number): string {
  if (typeof value !== "string") throw new ApiError(400, "Write a comment first.");
  const text = value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text === "") throw new ApiError(400, "Write a comment first.");
  if (charCount(text) > maxLength) throw new ApiError(400, `A comment is limited to ${maxLength} characters.`);
  return text;
}

export interface Viewer {
  email: string;
  role: Role;
  /** Email of the post's author. */
  postAuthor: string;
}

/** Public shape of one comment: explicit fields, never the writer's email. */
export function commentView(
  id: string,
  data: { authorEmail?: unknown; text?: unknown; createdAt?: unknown },
  authorName: string,
  viewer: Viewer | null,
) {
  const writer = String(data.authorEmail ?? "");
  const mine = !!viewer && writer !== "" && writer === viewer.email;
  return {
    id,
    authorName,
    text: String(data.text ?? ""),
    createdAt: String(data.createdAt ?? ""),
    mine,
    canRemove: !!viewer && (mine || viewer.postAuthor === viewer.email || viewer.role === "admin"),
  };
}

/** Public shape of one bookmark entry: explicit fields, never the author's email. */
export function bookmarkEntry(
  id: string,
  post: { title?: unknown; excerpt?: unknown; tags?: unknown; publishedAt?: unknown },
  authorName: string,
  savedAt: string,
) {
  return {
    id,
    title: String(post.title ?? ""),
    excerpt: String(post.excerpt ?? ""),
    tags: Array.isArray(post.tags) ? post.tags.filter((t): t is string => typeof t === "string") : [],
    publishedAt: String(post.publishedAt ?? ""),
    authorName,
    savedAt,
  };
}

type Body = Record<string, unknown>;

interface Deps {
  /** A published post by id, else the public 404. */
  loadPublished: (rawId: unknown) => Promise<{ id: string; post: { authorEmail: string } }>;
  authorNames: (emails: string[]) => Promise<Map<string, string>>;
  authorFallback: string;
}

const engRef = (id: string) => db().doc(`${ENGAGEMENT}/${id}`);
const likeRef = (id: string, key: string) => db().doc(`${ENGAGEMENT}/${id}/likes/${key}`);
const commentsCol = (id: string) => db().collection(`${ENGAGEMENT}/${id}/comments`);
const bookmarkRef = (key: string, id: string) => db().doc(`${BOOKMARKS}/${key}/posts/${id}`);
const rateRef = (key: string) => db().doc(`${RATE}/${key}`);

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

async function signedIn(body: Body) {
  const { email, role } = await requireSession(body.cookie, "site:view");
  return { email, role, key: userKeyOf(email), config: readBlogConfig(body.config) };
}

/** Reads the caller's rate document and returns the state to write; call before any write. */
async function takeRate(tx: Transaction, key: string, comment: boolean): Promise<[DocumentReference, RateState]> {
  const ref = rateRef(key);
  const snap = await tx.get(ref);
  return [ref, nextRate(snap.exists ? (snap.data() as Partial<RateState>) : undefined, Date.now(), comment)];
}

export function createEngagementActions(deps: Deps): Record<string, (body: Body) => Promise<unknown>> {
  async function viewerOf(body: Body, authorEmail: string): Promise<(Viewer & { key: string }) | null> {
    if (typeof body.cookie !== "string" || !body.cookie) return null;
    try {
      const { email, role } = await requireSession(body.cookie, "site:view");
      return { email, role, postAuthor: authorEmail, key: userKeyOf(email) };
    } catch {
      return null; // a bad or expired session is simply anonymous here
    }
  }

  async function engagementGet(body: Body) {
    const { id, post } = await deps.loadPublished(body.id);
    const config = readBlogConfig(body.config);
    const before = body.before;
    if (before !== undefined && (typeof before !== "string" || before.length === 0 || before.length > 40)) {
      throw new ApiError(400, "Invalid page marker.");
    }
    const viewer = await viewerOf(body, post.authorEmail);
    let query = commentsCol(id).orderBy("createdAt", "desc");
    if (typeof before === "string") query = query.where("createdAt", "<", before);
    const [counters, page] = await Promise.all([engRef(id).get(), query.limit(config.maxCommentsShown + 1).get()]);
    const rows = page.docs.slice(0, config.maxCommentsShown);
    const names = await deps.authorNames(rows.map((d) => String(d.get("authorEmail") ?? "")).filter(Boolean));
    let state: { liked: boolean; bookmarked: boolean } | null = null;
    if (viewer) {
      const [liked, bookmarked] = await Promise.all([likeRef(id, viewer.key).get(), bookmarkRef(viewer.key, id).get()]);
      state = { liked: liked.exists, bookmarked: bookmarked.exists };
    }
    return {
      likeCount: count(counters.exists ? counters.get("likeCount") : 0),
      commentCount: count(counters.exists ? counters.get("commentCount") : 0),
      comments: rows.map((d) =>
        commentView(d.id, d.data() ?? {}, names.get(String(d.get("authorEmail") ?? "")) ?? deps.authorFallback, viewer),
      ),
      hasMore: page.docs.length > config.maxCommentsShown,
      viewer: state,
    };
  }

  async function likeToggle(body: Body) {
    const user = await signedIn(body);
    const { id } = await deps.loadPublished(body.id);
    return db().runTransaction(async (tx) => {
      const [rr, rate] = await takeRate(tx, user.key, false);
      const like = likeRef(id, user.key);
      const [likeSnap, engSnap] = await Promise.all([tx.get(like), tx.get(engRef(id))]);
      const likes = count(engSnap.exists ? engSnap.get("likeCount") : 0);
      const comments = count(engSnap.exists ? engSnap.get("commentCount") : 0);
      const liked = !likeSnap.exists;
      const likeCount = liked ? likes + 1 : Math.max(0, likes - 1);
      tx.set(rr, rate);
      if (liked) tx.set(like, { createdAt: new Date().toISOString() });
      else tx.delete(like);
      tx.set(engRef(id), { likeCount, commentCount: comments, updatedAt: new Date().toISOString() });
      return { liked, likeCount };
    });
  }

  async function bookmarkToggle(body: Body) {
    const user = await signedIn(body);
    const { id } = await deps.loadPublished(body.id);
    return db().runTransaction(async (tx) => {
      const [rr, rate] = await takeRate(tx, user.key, false);
      const ref = bookmarkRef(user.key, id);
      const snap = await tx.get(ref);
      if (snap.exists) {
        tx.set(rr, rate);
        tx.delete(ref);
        return { bookmarked: false };
      }
      const all = await tx.get(db().collection(`${BOOKMARKS}/${user.key}/posts`).limit(user.config.maxBookmarksPerUser));
      if (all.docs.length >= user.config.maxBookmarksPerUser) throw new ApiError(409, "Bookmark limit reached.");
      tx.set(rr, rate);
      tx.set(ref, { createdAt: new Date().toISOString() });
      return { bookmarked: true };
    });
  }

  async function bookmarksList(body: Body) {
    const user = await signedIn(body);
    const saved = await db()
      .collection(`${BOOKMARKS}/${user.key}/posts`)
      .orderBy("createdAt", "desc")
      .limit(user.config.maxBookmarksPerUser)
      .get();
    if (saved.docs.length === 0) return { posts: [] };
    const posts = await db().getAll(...saved.docs.map((d) => db().doc(`blog_posts/${d.id}`)));
    const live: { id: string; data: Record<string, unknown>; savedAt: string }[] = [];
    const stale: DocumentReference[] = [];
    posts.forEach((snap, i) => {
      const data = snap.exists ? (snap.data() as Record<string, unknown>) : undefined;
      if (data && data.status === "published" && data.publishedAt) {
        live.push({ id: saved.docs[i].id, data, savedAt: String(saved.docs[i].get("createdAt") ?? "") });
      } else {
        stale.push(saved.docs[i].ref);
      }
    });
    // Lazy cleanup of bookmarks whose post is gone or unpublished; best effort.
    await Promise.all(stale.map((ref) => ref.delete().catch(() => undefined)));
    const names = await deps.authorNames(live.map((p) => String(p.data.authorEmail ?? "")).filter(Boolean));
    return {
      posts: live.map((p) =>
        bookmarkEntry(p.id, p.data, names.get(String(p.data.authorEmail ?? "")) ?? deps.authorFallback, p.savedAt),
      ),
    };
  }

  async function commentAdd(body: Body) {
    const user = await signedIn(body);
    const { id, post } = await deps.loadPublished(body.id);
    const text = cleanComment(body.text, user.config.maxCommentLength);
    const commentId = randomUUID();
    const createdAt = new Date().toISOString();
    const commentCount = await db().runTransaction(async (tx) => {
      const [rr, rate] = await takeRate(tx, user.key, true);
      const [engSnap, mine] = await Promise.all([
        tx.get(engRef(id)),
        tx.get(commentsCol(id).where("authorEmail", "==", user.email).limit(user.config.maxCommentsPerUserPerPost)),
      ]);
      const comments = count(engSnap.exists ? engSnap.get("commentCount") : 0);
      const likes = count(engSnap.exists ? engSnap.get("likeCount") : 0);
      if (comments >= user.config.maxCommentsPerPost) throw new ApiError(409, "This post has reached its comment limit.");
      if (mine.docs.length >= user.config.maxCommentsPerUserPerPost) {
        throw new ApiError(409, "You have reached the comment limit for this post.");
      }
      tx.set(rr, rate);
      tx.set(commentsCol(id).doc(commentId), { authorEmail: user.email, text, createdAt });
      tx.set(engRef(id), { likeCount: likes, commentCount: comments + 1, updatedAt: createdAt });
      return comments + 1;
    });
    const name = (await deps.authorNames([user.email])).get(user.email) ?? deps.authorFallback;
    const viewer: Viewer = { email: user.email, role: user.role, postAuthor: post.authorEmail };
    return { comment: commentView(commentId, { authorEmail: user.email, text, createdAt }, name, viewer), commentCount };
  }

  async function commentRemove(body: Body) {
    const user = await signedIn(body);
    const { id, post } = await deps.loadPublished(body.id);
    const commentId = body.commentId;
    if (typeof commentId !== "string" || commentId === "" || commentId.length > 80 || commentId.includes("/")) {
      throw new ApiError(404, "Comment not found.");
    }
    const ref = commentsCol(id).doc(commentId);
    return db().runTransaction(async (tx) => {
      const [rr, rate] = await takeRate(tx, user.key, false);
      const [snap, engSnap] = await Promise.all([tx.get(ref), tx.get(engRef(id))]);
      if (!snap.exists) throw new ApiError(404, "Comment not found.");
      const allowed =
        String(snap.get("authorEmail") ?? "") === user.email || post.authorEmail === user.email || user.role === "admin";
      if (!allowed) throw new ApiError(403, "Not allowed.");
      const comments = Math.max(0, count(engSnap.exists ? engSnap.get("commentCount") : 0) - 1);
      tx.set(rr, rate);
      tx.delete(ref);
      tx.set(engRef(id), {
        likeCount: count(engSnap.exists ? engSnap.get("likeCount") : 0),
        commentCount: comments,
        updatedAt: new Date().toISOString(),
      });
      return { commentCount: comments };
    });
  }

  return { engagementGet, likeToggle, bookmarkToggle, bookmarksList, commentAdd, commentRemove };
}

/** Removes all engagement data of a deleted post. Failure is logged, never thrown. */
export async function deleteEngagement(rawId: string): Promise<void> {
  try {
    await db().recursiveDelete(engRef(postId(rawId)));
  } catch (err) {
    console.error("blog: could not delete engagement data", rawId, err instanceof Error ? err.message : err);
  }
}
