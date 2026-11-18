## Context

Builds on the merged blog (#134; `openspec/specs/blog/spec.md`, archived change `personal-blog`, decisions D1-D10 there). Today: one private `blog` Cloud Function (actions `list|get|save|delete|imageUpload|imageGet|headers`) over Firestore `blog_posts/{id}` (Markdown `body`) and the private `<project>-blog` bucket; the Next.js server (`src/middleware/blogService.ts`, `src/app/api/blog/*`) forwards the session cookie plus the config limits; `/blog` and `/api/blog/*` need `blog:write` (config-driven) and 404 while `enabled` is false; the only public blog path is `GET /api/blog/headers` (30 s server pool, random sample). The editor is a Markdown `textarea` with a `react-markdown` preview (`BlogPreview`, `skipHtml`, `blog-image:<id>` scheme). Limits: title/tags/excerpt are already counted with `.length`; the body limit is `maxBodyBytes`.

Goals: author name on headers; public read-only post page; Medium-style rich-text editor; every text limit in characters with live counters. Non-goals: as in the proposal.

No new cloud resource, function, secret, IAM or cost line is needed (see "Tier-2 review" at the end).

## Decisions

### D1. Author display name: resolved server-side from `allowed_emails/{email}.displayName`, never from the post
`allowed_emails/{email}.displayName` already exists (the Google account name, written by `registerIfAbsent` at first sign-in; `""` for admin-added users). The `blog` function resolves it **at read time** for the public actions (`headers`, `publicGet`): collect the distinct `authorEmail` values of the posts it returns, `db().getAll(...)` those user documents (a handful), and return only `authorName`. `authorName` = trimmed `displayName` limited to 60 characters; when it is empty or contains `@` (an email must never leak through a name field) it is the neutral fallback `"Author"`. `authorEmail` is never put in a public response object: the public actions build their output from an explicit field list (`id, title, excerpt, tags, publishedAt, authorName` plus `content/body/images` for `publicGet`), not by spreading the stored document. Revoked authors keep their published posts and name.
- *Rejected:* storing `authorName` on each post (stale after a rename, needs a backfill of existing posts, i.e. a data migration); a name field admins edit in `/admin/access` (new UI and stored-data scope).
- *Small improvement (optional, PO/owner may veto):* `registerIfAbsent` also writes `displayName` when the existing document has an empty one and the token carries a name, so admin-added users get a real name on their next sign-in instead of "Author". It writes an existing field only when empty and never changes role or `allowed`. If vetoed, the fallback covers it.

### D2. Storage: a typed rich-text document, Markdown posts untouched
A rich post stores `content` (a JSON document, ProseMirror/Tiptap shape) and `format: "doc"`; a post without `format` is Markdown (`body`, exactly as today). Reading prefers `content`.
- **Closed schema, validated on the server** (`validateDoc`, D3): nodes `doc, paragraph, heading (level 1-3), bulletList, orderedList, listItem, blockquote, codeBlock, horizontalRule, hardBreak, image (attrs imageId, alt), text`; marks `bold, italic, underline, strike, code, link (href http/https/mailto)`. Anything else, an unknown attribute, depth over 12 or more than 20 000 nodes is a 400. So stored data is always renderable and never carries HTML.
- **Legacy Markdown, no loss, no migration:** old posts are not rewritten. The public page and view mode render them with the existing safe `react-markdown` pipeline. When an author opens one in the editor the browser converts it to a document (`@tiptap/markdown`); constructs the schema cannot hold (GFM tables, task lists, raw HTML, remote images) are detected before conversion and the editor shows a notice that saving will drop them. A save writes `content` + `format: "doc"` and **leaves `body` (the original Markdown) in the document untouched** as a rollback copy; nothing is deleted. Firestore point-in-time recovery is also in place. `excerpt` is rebuilt from the document's plain text.
- *Rejected:* storing HTML (needs a sanitizer on every read, the classic XSS source); converting Markdown to HTML or rewriting all posts at deploy (a destructive migration the owner has not approved); keeping Markdown as the only format (no underline, lossy round trip for a WYSIWYG editor).
- Size: the character limit (D5) is the product limit; a fixed `MAX_DOC_BYTES = 700 000` on the serialized document keeps it far below Firestore's 1 MiB document limit (message: "The post is too large to store").
- Back-compat during rollout: stage 2 deploys the function before stage 3 deploys the app, so the function keeps accepting the old `save` shape (`body` string, Markdown) and adds `content`. The old app keeps working until the new one is live.

### D3. One shared pure module, mirrored in `functions/`
`src/lib/blogDoc.ts` (types `BlogDoc`/`BlogNode`/`BlogMark`, `validateDoc(value): BlogDoc` throwing a message, `docText(doc): string` plain text with `\n` between blocks, `charCount(text): number` = Unicode code points (`Array.from(text).length`, so an emoji is 1, the same everywhere), `docExcerpt(doc, n)`) is copied byte-for-byte to `functions/src/blogDoc.ts` because `functions/` is its own package (precedent: `resumeValidation.ts`). `scripts/check-blog-contract.mjs` fails when the two files differ. The renderer re-validates the document it is given (defence in depth) with the same function.

### D4. Editor: Tiptap (ProseMirror), loaded only on `/blog`
| Option | Notes |
|---|---|
| **Tiptap v3 (`@tiptap/react`, `starter-kit`, `extension-image`, `@tiptap/markdown`)** | StarterKit holds headings, bold, italic, underline, strike, lists, quote, code, code block, hr, link, undo/redo, keyboard shortcuts and input rules (typing `## ` or `**x**` formats live, the Medium feel). Schema-driven, JSON in/out. Roughly 100 KB gzip, loaded with `next/dynamic` only by the editor (the public page and `/` never load it). |
| Lexical | Smaller core (~30 KB) but toolbar, markdown shortcuts, links, images and lists each need hand wiring: more code, more bugs. |
| Slate | Maximum freedom, but undo, lists and IME handling are on us. |
| Quill / CKEditor / TinyMCE | HTML or delta output (rejected in D2), larger, licence or theming friction. |

**Owner decision: an established third-party library, no hand-built editor.** Chosen: Tiptap (MIT, a ProseMirror wrapper; ProseMirror has been the stable core of many production editors for years). Checked on the npm registry (2026-11-18): `@tiptap/react`, `starter-kit` and `@tiptap/markdown` are 3.34.0, MIT, with a React peer range of `^17 || ^18 || ^19` (React 19 supported); it is a client-only component, so it works under Next 16 inside a `'use client'` module loaded with `next/dynamic`. Lexical (0.53.0, MIT, React >=18) is the closest alternative and was rejected for the hand-wiring it needs and for still being pre-1.0 (API churn); Slate and the HTML/delta editors were rejected as above. Bundle: about 100 KB gzip, loaded by `next/dynamic` only from `BlogEditor` (so only on `/blog`); `/`, `/about` and the public `/posts/[id]` page import no editor code, because `BlogContent` is a plain renderer. The Builder proves it by comparing the route's first-load JS and the network requests of `/` and `/posts/<id>` and reports the numbers.

The Builder pins the exact versions at install time, checks that StarterKit includes Underline and Link (otherwise adds those two extensions), runs `npm run build` and records the `/blog` route's first-load JS before and after in the task report. Toolbar plus a bubble menu on selection; the image button reuses the existing upload (`blog-image:<id>`); the link prompt validates the scheme. Ctrl/Cmd+B/I/U, strike, link, undo/redo and Markdown input rules come from Tiptap. The editor's working document is local state (as the CMS editor); Redux only carries the API calls.

### D5. Limits in characters, with live counters
- **Unit:** a character is a Unicode code point (D3) so the browser and the function agree. Body length counts `docText` (visible text with a newline between blocks), or the Markdown string for a legacy `body`.
- **Config:** new `maxBodyLength` (min 1, hard max 200 000, default 50 000). `maxTitleLength`, `maxTagLength`, `maxTagsPerPost` (a count), `excerptLength` are unchanged keys, now documented in characters and counted by code points. `maxImageBytes` stays in bytes.
- **Legacy key:** `maxBodyBytes` is no longer in the type or example, but the sanitizer still reads it: when `maxBodyLength` is absent or invalid and `maxBodyBytes` is a valid whole number, `maxBodyLength = clamp(maxBodyBytes)` (a character is at least one byte, so the limit is never stricter than before, and `MAX_DOC_BYTES` still bounds storage); when neither is valid the example's default applies. A warning names the deprecated key. The functions' `readBlogConfig` applies the same derivation if it ever receives only the old key, so the two layers agree. Over-limit refusals say "over the limit of N characters".
- **Counters:** the editor shows `n / max characters` under the title and the body (`aria-live="polite"`, warning style at 90 %, error style over), `n / max` for tags per post and for the tag being typed. Typing is not blocked (a paste must not silently truncate); Save is disabled while any text is over its limit and says which one. The excerpt is generated, not typed, so it has no counter; it is cut at `excerptLength` characters.

### D6. Public read: server-rendered page `/posts/[id]` and public image route
`/blog` is gated by `blog:write`, so the public namespace is `/posts` and `/api/posts`, as exact anchored patterns in `access.ts` (`isPublicPostPath`: `/posts/<uuid>` and `/api/posts/<uuid>/images/<imageId>`; nothing else under those prefixes is public). Every other blog route is unchanged (anonymous `/blog` redirects, `/api/blog/*` 401).
- **Page** `src/app/posts/[id]/page.tsx`: a server component (`force-dynamic`) calling `getPublicBlogPost(id)` in `blogService.ts` (function action `publicGet`) and `notFound()` when the blog is off, the id is malformed or unknown, or the post is a draft or deleted. `generateMetadata` sets only the page title (React `cache()` shares the one fetch). There is no JSON endpoint for the post body, so nothing else to protect.
- **Function:** two new actions on the existing `blog` function, no new function: `publicGet {id}` (published only; a draft answers the same 404 as a missing post; returns `{ post: { id, title, tags, publishedAt, authorName, format, body|content, images: [{id, name, contentType}] } }`) and `publicImageGet {id, imageId}` (the post must be published and own the image). `headers` also returns `authorName`.
- **Image route** `GET /api/posts/[id]/images/[imageId]`: blog-on check, `publicImageGet`, bytes with the stored image type, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: public, max-age=30` (an unpublished post's images stop within the same 30 s tolerance).
- **30 s tolerance:** `getPublicBlogPost` keeps a small in-memory cache (30 s, at most 50 entries, published posts only, never a draft), so public traffic costs at most one function call per post per 30 s per instance; a post unpublished or deleted can stay readable for up to 30 s, as for the home pool (PO: state the same window for the page in the spec if you want it explicit).
- **Rendering and XSS:** `BlogContent` (`src/components/blog/BlogContent.tsx`, no `'use client'`, usable by the server page and the author's view mode) maps the validated document to React elements; it never parses HTML and never uses `dangerouslySetInnerHTML`. Links: only http, https, mailto, `target="_blank" rel="noopener noreferrer nofollow ugc"`. Images: only an `imageId` matching `^[A-Za-z0-9_-]+$`, resolved by a caller-supplied `imageUrl(imageId)` (public: `/api/posts/<id>/images/<imageId>`; author view: `/api/blog/<id>/images/<imageId>`); never a remote `src`. Legacy Markdown posts render through the existing `react-markdown` component (made server-safe by dropping `'use client'`; it has no hooks) with `skipHtml`, no `rehype-raw`, remote images dropped. A hostile script, event handler or remote image in either format renders as inert text or nothing.
- **Never leaks:** public actions use explicit field lists; the Next layer copies only the public fields again (`unwrapPublicPost`, like `unwrapHeaders`); `check-blog-contract.mjs` gains cases asserting no `authorEmail` or `@` in `headers` and `publicGet`, and 404 for drafts, deleted posts, malformed ids and draft images.
- **Cost/abuse:** one Firestore read (plus one `getAll` of author documents) per post per 30 s per Next instance and image downloads of at most 5 MB; the same order as the existing headers pool, no new resource. The function's existing instance cap bounds the worst case.

### D7. Author view mode
`/blog` gets a read-only view of a post (`BlogView`: `BlogContent` over the authenticated `getBlogPost`, drafts included, with an Edit button and, for published posts, an "Open public page" link). List rows have View and Edit. Ownership rules are unchanged (the existing `get`).

### D8. Home headers
`LandingBlog` shows `authorName` (`By <name>`) and each card is a `next/link` to `/posts/<id>` (the route loader already reacts to same-origin link clicks). `BlogHeader` and `unwrapHeaders` gain `authorName`.

### D9. Client API and state
RTK Query endpoints stay in `src/store/api.ts`: `saveBlogPost` carries `content` (or the legacy `body`), `getBlogPost` returns `format`/`content`; the public page needs none (server rendered). `SUCCESS` messages are unchanged. Types live in `src/lib/blogTypes.ts` (`BlogPost` gains `format`, `content?`, `body?`; `BlogHeader` gains `authorName`).

## Risks / Trade-offs

- **Bundle:** Tiptap adds roughly 100 KB gzip to `/blog` only; measured in the Builder report (D4).
- **Markdown conversion fidelity:** unsupported constructs are announced before saving and the original Markdown stays stored (D2).
- **Two formats** remain until the owner approves a migration (out of scope); the renderer keeps both.
- **Public exposure** of published posts and their images is the proposal's request; drafts, emails and other private data are excluded by construction and by contract tests.
- **30 s staleness** for unpublished content (D6).
- **Code points vs. storage:** a character can be 4 bytes, so `MAX_DOC_BYTES` is the storage backstop.

## Migration Plan

No data migration. Normal pipeline order (stage 2 function first, stage 3 app); the function stays compatible with the old app. Rollback: `enabled: false` hides everything; old Markdown posts are untouched and converted posts keep their original `body`.

## Tier-2 review (for the Product Owner and owner)

No new cloud resource, Cloud Function, IAM, secret or ongoing cost. To be aware of: (1) public read of published posts and images (already in the proposal); (2) the optional `displayName` write-back in D1 (an existing field, only when empty); (3) new npm dependencies (Tiptap packages, `/blog` only).

## Open Questions

None blocking. The excerpt is generated, so it gets no typing counter (D5); an author-written excerpt would be a new field and scenario, only if the owner asks.
