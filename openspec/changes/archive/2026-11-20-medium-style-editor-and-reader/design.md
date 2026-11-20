## Context

The blog (changes `personal-blog`, `blog-reader-and-rich-editor`, `blog-editor-and-reader-options`) is: browser -> Next.js `/api/blog*` and `/api/posts/*` -> `src/middleware/blogService.ts` -> ONE private Cloud Function `blog` (`functions/src/blog.ts`, dispatch on `action`) -> Firestore `blog_posts/{id}` and the `<project>-blog` bucket. The editor is Tiptap v3 with a fixed toolbar (`EditorToolbar`, which already uses `BubbleMenu` from `@tiptap/react/menus` for the link form); the public reader is the server rendered `/posts/[id]` inside `ReaderFrame`. This change restyles both and adds likes, bookmarks and comments for any signed-in user.

Constraints from the owner: copy only Medium's layout and interaction patterns (never its name, logo, icons, assets, fonts); keep the #141 reader options, character limits, style whitelists and the closed document schema (`blogDoc.ts`); legacy (Markdown) posts keep rendering; no new cloud resource, IAM or secret.

## Goals / Non-Goals

**Goals:** floating toolbar and "+" insert menu in the editor; narrow serif reading column with byline, read time and captions; like, bookmark, comment with public counts and comments; every write validated and rate limited server-side; no private data in public responses.

**Non-Goals:** everything in the proposal's Out of scope; changing the stored post format; a public bookmark count; comment editing or replies.

## Decisions

### D1. Engagement lives in the existing `blog` function (new actions) and the existing Firestore. No new cloud resource, IAM, secret, index or rules change.
Rejected: a second function (a new Cloud Function is a tier-2 item and the repo rule is "add actions, never one function per small task"); client-side Firestore access (rules deny all clients and must stay so). Every query below is a single-field `orderBy` or a document get, which Firestore indexes automatically, so no composite index is needed. `firestore.rules` is unchanged (`/{document=**}` stays denied; Admin SDK only). **Result: nothing here needs the owner's tier-2 escalation.**

### D2. Data model (all new documents are written only by the `blog` function)

| Path | Fields | Notes |
|---|---|---|
| `blog_engagement/{postId}` | `likeCount`, `commentCount`, `updatedAt` | Counters, kept in the same transaction as the write they count. A separate doc, **not** fields on `blog_posts/{id}`, so an engagement write never bumps the post `version` (that would make the author's save a 409) and never touches the author-owned doc. A missing doc means 0 / 0. |
| `blog_engagement/{postId}/likes/{userKey}` | `createdAt` | `userKey = sha256(lowercase email)` hex (the same scheme as `resume_owners`), so the document id is not an email. One doc per user per post = a toggle. |
| `blog_engagement/{postId}/comments/{commentId}` | `authorEmail`, `text`, `createdAt` (ISO) | `commentId` = `randomUUID()`. `authorEmail` is private: used only for ownership and display-name lookup, never returned. Flat: no parent field. |
| `blog_bookmarks/{userKey}/posts/{postId}` | `createdAt` | A user's bookmarks. No public bookmark count (decision: the spec asks for like and comment counts). |
| `blog_rate/{userKey}` | `w`, `n`, `cw`, `cn` | Rate-limit windows, see D4. |

Display names come from `allowed_emails/{email}.displayName` through the existing `authorNameOf`/`authorNames` (empty or containing `@` becomes "Author"), so a commenter's email never leaves the function.

**Post lifecycle.** A post that is not `published` (draft, unpublished, deleted, malformed id) answers every engagement action with the same 404 as `publicGet` (`loadPublished`). Unpublishing keeps the data (re-publishing brings it back) but nothing is readable or writable meanwhile. Deleting a post runs `db().recursiveDelete(blog_engagement/{postId})` after the post is removed (inside `remove` in `blog.ts`). Bookmarks of other users cannot be found without a collection-group index, so they are cleaned lazily: the bookmarks list drops (and deletes, best effort) entries whose post is missing or not published. Rejected: a collection-group query on bookmarks (needs a Firestore field-index resource in Terraform).

### D3. New `blog` actions (JSON contract; `cookie` = the `__session` cookie, `config` = forwarded blog config as today)
Authorization for all but `engagementGet`: `requireSession(cookie, "site:view")` - any role with access, **not** `blog:write`. `allowed: false` stays refused. The caller's identity is always the verified email, never a field.

- `engagementGet { id, cookie? }` -> `{ likeCount, commentCount, comments: [{ id, authorName, text, createdAt, mine, canRemove }], hasMore, viewer: null | { liked, bookmarked } }`. No cookie or an invalid one is anonymous (`viewer: null`, no error). Comments newest first, at most `maxCommentsShown` (default 50) per call; `before` (a `createdAt`) pages older ones. `mine` and `canRemove` are viewer-relative booleans (`canRemove` = writer, post author or admin). Explicit field lists only; no email, no user key.
- `likeToggle { id, cookie }` -> `{ liked, likeCount }` (transaction: read like doc, create or delete it, adjust the counter, never below 0).
- `bookmarkToggle { id, cookie }` -> `{ bookmarked }`; adding past `maxBookmarksPerUser` (default 200) is a 409 "Bookmark limit reached."; removing always works.
- `bookmarksList { cookie }` -> `{ posts: [{ id, title, excerpt, tags, publishedAt, authorName, savedAt }] }` newest saved first, built from the bookmark ids, one batched `getAll` of the posts, dropping unpublished ones (D2).
- `commentAdd { id, text, cookie }` -> `{ comment, commentCount }`. `text` is NFC-normalised, control characters other than `\n` removed, more than two consecutive newlines collapsed, trimmed; empty -> 400 "Write a comment first."; over `maxCommentLength` characters (Unicode code points, like the other limits; default 1000, range 50-5000) -> 400 naming the limit; nothing is stored on any refusal. Past `maxCommentsPerUserPerPost` (default 20) or `maxCommentsPerPost` (default 1000) -> 409.
- `commentRemove { id, commentId, cookie }` -> `{ commentCount }`; allowed for the comment's writer, the post's author (`post.authorEmail`) and the admin, otherwise 403 for an existing comment (404 for a missing one).

New `blog-config.json` keys (sanitised in `blogConfigSanitize.ts` and in `functions/src/blogValidation.ts` `readBlogConfig`; a bad value falls back to its default): `maxCommentLength`, `maxCommentsShown`, `maxCommentsPerUserPerPost`, `maxCommentsPerPost`, `maxBookmarksPerUser`. `maxCommentLength` is also in the public editor-config subset so the UI can show a live counter.

### D4. Rate limits (server-side, per verified user, in Firestore)
A fixed-window counter per user in `blog_rate/{userKey}`, read and written in the same transaction as the engagement write it guards, so parallel requests cannot pass it:
- all engagement writes (like, bookmark, comment add and remove): **30 per minute** (`w` = minute window start, `n`);
- comments added: **5 per 10 minutes** (`cw`, `cn`).
Over the limit -> HTTP 429 `{ error: { message: "Too many actions. Try again in a minute." } }` (shown by the existing snackbar). The constants live in code (`functions/src/blogEngagement.ts`), not config: an editable limit is a way to turn the protection off. Reads are not limited per user; the public read is bounded by `maxCommentsShown` and one batched name lookup. Rejected: an in-memory limiter (instances are many and short-lived), Redis/Memorystore (new cloud resource).

### D5. Next.js routes and access policy (`src/lib/access.ts`, `src/proxy.ts`)
Engagement is for every signed-in user, so it must **not** sit under `/api/blog` (`blog:write`). New routes, under the existing `/api/posts/[id]`:
- `GET /api/posts/[id]/engagement` - **public** (a new anchored entry in `PUBLIC_POST_PATHS`, exact shape like the image route). The handler reads the cookie itself, treats a bad one as anonymous, checks `blogConfig.enabled` (404 otherwise) and answers `Cache-Control: no-store`.
- `POST /api/posts/[id]/like`, `POST /api/posts/[id]/bookmark`, `POST /api/posts/[id]/comments`, `DELETE /api/posts/[id]/comments/[commentId]` - **not public**: the proxy's default-deny gives them `site:view` (every role holds it) and the handlers re-verify the session and check `enabled`.
- `GET /api/bookmarks` and the page `/bookmarks` - not public, `site:view`.
`isBlogRoute` is widened to these non-public paths so `blog.enabled = false` answers 404 for every role, as for `/blog`; the public engagement GET checks `enabled` itself (like the post page). `/api/blog/*` keeps `blog:write`, untouched. Rejected: writes under `/api/blog` with `blog:write` relaxed (widens the author API); making all of `/api/posts/*` public (writes would lose the proxy's session check).

### D6. Where the bookmarks list lives
A signed-in page **`/bookmarks`** (client page over `GET /api/bookmarks` through RTK Query; cards like the home blog cards, each linking to `/posts/<id>`, an unbookmark control, an empty state). Entry points: a "Saved" link in the post page header for signed-in readers and a `bookmarks` drawer entry (`nav.drawerItems`, icon `bookmark`, added to `profile.example.json` and the drawer icon map; as with `blog`, the owner adds it once to the stored profile because a stored array replaces the example's). Rejected: a tab inside `/blog` (that page needs `blog:write`, readers cannot open it).

### D7. Client state
RTK Query endpoints in `store/api.ts` (`getPostEngagement`, `toggleLike`, `toggleBookmark`, `addComment`, `removeComment`, `getBookmarks`) with tags per post and `Bookmarks`; sign in and out invalidate them (viewer state). Like and bookmark toggles update the cached result optimistically and roll back on error. Failures reach the user through the existing notifications listener (no component dispatches toasts; add `SUCCESS` messages for comment add/remove, silent for like and bookmark). The viewer's role comes from `useGetSessionRoleQuery`; an anonymous viewer sees the counts and a "Sign in to like, save or comment" prompt using the existing `ui/GoogleSignIn`. The post page stays server rendered; engagement is a client island below the article.

### D8. Editor
`RichEditor`'s schema and extensions stay untouched (the closed document in `blogDoc.ts` does not change, so the server mirror, `check:blog` and legacy posts are unaffected). The fixed `EditorToolbar` is replaced by:
- `BubbleMenu` (already available in `@tiptap/react/menus`, no new dependency) on selection: bold, italic, link, heading (H2, H3), block quote, bullet/numbered list with the style whitelists, alignment. The existing link form and list-style choices move into it. On coarse pointers (`matchMedia('(pointer: coarse)')`) it is placed below the selection so it does not sit under the OS selection handles.
- `FloatingMenu` with a "+" button on an empty paragraph: image (the existing Upload / By URL flow and its draft-save rules are kept as they are), horizontal rule, bullet list, numbered list, block quote.
- Keyboard: both menus follow keyboard selection (Shift+arrows) because they are driven by the editor selection; `Alt+F10` moves focus into the floating toolbar (`role="toolbar"`, roving arrow keys) and `Escape` returns it to the editor; `Alt+F10` or `Enter` on an empty line focuses the "+" control, which opens its menu with Enter/Space; the Tiptap shortcuts (Mod+B, Mod+I, undo/redo) keep working. All controls are real buttons with accessible names and large enough touch targets.
- The title becomes a large borderless auto-growing `textarea` above the body, the body a serif column, character counters kept. Draft/publish, tags and the save flow in `BlogEditor` are untouched. Underline, strike, code, code block and undo/redo have no button any more but stay available through their shortcuts and Markdown input rules, so no stored format is lost; the editor shows a short shortcuts hint.
Rejected: a different editor library (migration risk); changing the stored format.

### D9. Reader
- Typeface: a **system serif stack** (`Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif`): no font download, nothing copied from Medium.
- Layout: a centered column of about 42rem (compact) and the existing wider option (wide), a large title, a byline row (author name, publish date, estimated read time), tags, then the body at about 1.25rem/1.7. `ReaderControls` and the theme/width preferences (`readerPrefs.ts`) are unchanged.
- Read time: `Math.max(1, Math.ceil(words / 220))` from the document text (a pure helper `src/lib/readTime.ts`; for a legacy post, from the Markdown body); shown as "N min read".
- Captions: `BlogContent` renders an image with non-empty alt as `<figure><img><figcaption>alt</figcaption></figure>`; the `img` attributes stay exactly as in #141. An image without alt stays a bare `<img>`.
- 320px: column padding `px-4`, long words wrap (`overflow-wrap: anywhere`), images `max-width: 100%`; light and dark come from daisyUI tokens and the existing `data-reader-theme` variables.
- Styles go in new files `styles/components/blog-reader.css` and `blog-engagement.css` and the existing `blog-editor.css`; the Architect adds the `@import`s to `src/index.css` once before the Builders start so no two groups edit it.

### D10. Mirrors and shared code
No new byte-mirrored file. `functions/src/blogEngagement.ts` is function-only; browser types go in `src/lib/blogTypes.ts`. Rate-limit constants and comment sanitising stay in `functions/`; the browser only learns `maxCommentLength` from the public config subset.

## Risks / Trade-offs

- Public `engagementGet` is an unauthenticated read costing one counter read, up to 50 comment reads and one batched name read. Bounded by `maxCommentsShown`; acceptable at this site's scale and `no-store`. If abuse appears, add a short in-instance cache; no per-IP limiter exists today.
- `recursiveDelete` on post delete runs after the post delete, so a failure leaves orphans under an id that is no longer a post (unreadable: every action 404s on a missing post). Logged, not fatal.
- A toggle is a toggle: a retry after a lost response flips it back; the UI re-syncs from the returned `liked`/`bookmarked`.
- Stale bookmarks of deleted posts persist until their owner opens `/bookmarks` (lazy cleanup) and are never visible.
- Security-relevant surface: new write endpoints for non-author roles. Mitigated by session-verified identity, published-only posts, plain-text rendering by React (no HTML parsing, no autolinking), length limits, rate limits and no email in any response (explicit field lists, covered by the contract check in task 1.5).

## Migration Plan

No data migration: the new collections appear on first write; existing posts and `blog-config.json` need no change (new keys fall back to defaults). Rollback is a normal redeploy: the old code ignores the new collections. A function change is stage 2 of the pipeline and touches only the `blog` function's source.

## Open Questions

None blocking. Assumption for the PO to confirm with the owner: bookmark counts are private (only likes and comments are public counts).
