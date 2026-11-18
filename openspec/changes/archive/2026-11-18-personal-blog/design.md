## Context

The site is browser -> Next.js server (`src/middleware/`, `src/app/api/`) -> private Cloud Functions -> Storage/Firestore. Roles are static (`reader < user-base < user-advanced < admin`) in `src/lib/access.ts`, mirrored in `functions/src/policy.ts`. Config files are read through the one `getConfig` function (`CONFIG_FILES`), cached 30s, sanitized per key. Resumes (`functions/src/resumes.ts`) are the closest precedent: per-owner private objects in `<project>-resumes`, session cookie verified inside each function, other owners' ids are a 404. The home page `/` is a public client component; `/` and `/about` are the only public paths.

Two things are new here: a permission whose roles come from config (not from `ROLE_GRANTS`), and a public read of other users' data (headers only).

## Goals / Non-Goals

**Goals:** authoring with per-author ownership and an admin override; private storage; a public random sample of published headers; everything switchable and bounded by `blog-config.json`.
**Non-Goals:** as in the proposal (no public post pages, comments, rich text, scheduling, search, RSS, versioning).

## Decisions

### D1. Permission `blog:write` is config-driven, and admin always holds it
`Permission` gains `'blog:write'`, but it is **not** in `ROLE_GRANTS` (a role hierarchy cannot express "user-advanced but not user-base"). `can(role, permission, ctx?)` takes an optional `ctx: { blogWriteRoles?: readonly Role[] }`; for `blog:write` it is true when `role === 'admin'` or the role is in `ctx.blogWriteRoles` (default `['admin']`, also used when the config is unreadable, which keeps the spec's "unreadable -> admin only"). The same function is mirrored in `functions/src/policy.ts`. Every other permission is unchanged and ignores `ctx`.
- Admin is always included (the sanitizer adds it, and `can` ignores its absence). Reason: the admin must be able to edit any author's post (spec), and a config typo must not lock the owner out. *Rejected:* letting the config remove admin. **PO: please confirm this reading of "roles configurable, admin by default".**
- The proxy, API routes and functions each call `can(role, 'blog:write', { blogWriteRoles })`. The proxy and API routes read the roles from `getBlogConfig()`; the Next.js server forwards `writeRoles` to the functions (same trust model as the resume config: the config is admin data and only the site can call the functions). Functions re-validate the forwarded value (each entry must be a known role, else `['admin']`).
- *Rejected:* a new role (`author`). It would change `ROLES`, `user-access` and the admin panel, which the proposal rules out.

### D2. Routes and the on/off switch
- Page `/blog` (list + editor in one page, `?open=<id>`, like `/resume-builder`).
- Authenticated API under `/api/blog` (`requiredPermission` -> `blog:write`): `GET|POST /api/blog`, `GET|PUT|DELETE /api/blog/[id]`, `POST /api/blog/[id]/images`, `GET /api/blog/[id]/images/[imageId]`, `GET /api/blog/config` (limits for the editor).
- One **public** API path, `GET /api/blog/headers`, added to `PUBLIC_PATHS` as an exact match (public paths are checked first, so the `/api/blog` prefix rule does not apply to it). It returns headers only (D6) and does its own config check.
- The blog is switched by `blog-config.json` (`enabled`), not by the profile's drawer item, so it is **not** added to `FEATURE_ROUTES`. `src/proxy.ts` gets a second gate for `/blog` and `/api/blog/*` (except `/headers`): after the permission check, 404 (page rewrite or API JSON) while `enabled` is false. Route handlers repeat the check (`blogOff()` in `routeHelpers`-style, defence in depth, like `featureOff`).
- The drawer entry `blog` (`href: /blog`) is a normal `nav.drawerItems` entry. `visibleDrawerItems`/`hasDrawerContent`/`visibleMenuItems` take the same `ctx` so the entry shows only for roles that hold `blog:write` and only while the blog is enabled. The browser gets `{ enabled, writeRoles, home heading/intro }` (public values only) from the root layout through a `BlogConfigProvider`/`useBlogConfig()` (same pattern as `HomeConfigProvider`). The owner adds the entry to the stored profile once (a stored array replaces the example's).

### D3. Post storage: Firestore document per post (no new resource)
`blog_posts/{postId}` (UUID): `authorEmail`, `title`, `body` (Markdown), `tags[]`, `images[]` (`{id, contentType, bytes, name}`), `status` (`draft|published`), `excerpt` (computed on save: Markdown stripped, cut to `excerptLength`), `version` (int, +1 per save), `createdAt`, `updatedAt`, `publishedAt` (set when first published, kept on later saves, cleared on unpublish).
- Why Firestore: ownership and publish filters are single-field equality queries (`authorEmail == x`, `status == 'published'`), so **no composite index** (sorting is in memory over a bounded set); delete is atomic; point-in-time recovery and delete protection already exist; nothing new to provision. `firestore.rules` already denies every client access (`/{document=**}` false), so no rule change.
- Concurrency: save requires the `version` read earlier, checked in a transaction; mismatch is a 409 like resumes.
- *Rejected:* one JSON object per post in a bucket (like resumes). A public random sample then needs a second index in Firestore anyway, and listing by metadata is limited to 8 KB per object.
- Size: `body` is limited by `maxBodyBytes` (default 100 KB, hard cap 500 KB in code, well under the 1 MiB document limit).

### D4. Image storage: a new private bucket `<project>-blog` (**owner decision needed**)
Options and cost (personal-blog scale: tens of images, a few MB each):

| Option | What it is | New cloud resource | Cost | Notes |
|---|---|---|---|---|
| **A (recommended)** | New bucket `<project>-blog`, Terraform like `resumes_storage`: private, public access prevention, `prevent_destroy`, `force_destroy=false`, versioning with noncurrent versions deleted after 30 days. Objects `<postId>/<imageId>`. | 1 bucket + `outputs.tf` entry | Standard storage about 0.02 USD/GB-month, operations in fractions of a cent: effectively 0 at this scale, the same as the resumes bucket | Same pattern, own retention, no coupling to CMS tooling. Functions already reach buckets as the default runtime account (no IAM change). |
| B | Reuse the CMS bucket under prefix `blog-images/` | none | same | No Terraform, but the CMS bucket is snapshotted and hardened by `scripts/deploy/backup-snapshot.sh`/`harden-buckets.sh`, so blog images would be copied into the state bucket; mixes admin config with user content. |
| C | Base64 inside the post's Firestore document | none | Firestore reads/writes grow | 1 MiB document limit makes it unusable for real images. |

Image rules (code, not config): only `image/png`, `image/jpeg`, `image/webp`, `image/gif`, detected from the **magic bytes** (the claimed type is ignored); no SVG (script risk). Limits from config: `maxImageBytes` (default 2 MB, hard cap 5 MB), `maxImagesPerPost` (default 10). Upload: browser -> `POST /api/blog/[id]/images` (JSON `{name, contentType, dataBase64}`) -> `blog` action `imageUpload`; bytes never reach a URL a browser can open directly. Serving: `GET /api/blog/[id]/images/[imageId]` -> `blog` action `imageGet` returns base64 and the Next route replies with the bytes (`Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, the stored type). Each image requires the same ownership check as its post. An upload does not bump the post `version` (it touches only `images[]` in a transaction), so it never causes a 409 on the editor's text.
- A post must exist before images can be added (the editor creates the draft on first save); a removed image is deleted from the bucket on the next save (`removeImageIds`), and deleting a post deletes its image prefix.

### D5. Markdown and images in the body
The body is plain Markdown. Rendering (editor preview only; there are no public post pages) uses `react-markdown` + `remark-gfm` (new dependency, MIT, no `dangerouslySetInnerHTML`; raw HTML in Markdown is **not** rendered). An image reference is `![alt](blog-image:<imageId>)`; the renderer maps that scheme to `/api/blog/<postId>/images/<imageId>` and drops every other image source (no remote images: no tracking, no mixed content). Links open with `rel="noopener noreferrer"` and only http/https/mailto. The server validates that each `blog-image:` id in the body belongs to the post (a dangling id is allowed in drafts, shown as a broken image).

### D6. Public headers (the one public read of user data)
`GET /api/blog/headers` -> `blog` action `headers` (no cookie). It returns only `{ id, title, excerpt, tags, publishedAt }` of `status == 'published'` posts. **Never the author email, the body, image ids or the draft state.** The Next server keeps the pool of published headers in memory for **30 s** (same TTL as the config loader, so a post unpublished or deleted can still show on the home page for up to 30 s; this is the only consistency gap and the spec's "no longer appears" scenarios hold within that window; **PO: please add that tolerance to the spec, or tell me to shorten it**), picks `homeSampleSize` at random for every request (Fisher-Yates on a copy), and answers `no-store`. The function reads at most `maxPublicScan` (500, fixed in code) published documents with `.select()` of the header fields, so the read bill per cache miss is bounded. Past 500 published posts the sample is drawn from the 500 most recently published; documented in the code and config doc.
The home block (`LandingBlog`) renders nothing for an empty list, `enabled: false`, or a failed fetch (never an error state on the public page).

### D7. Ownership and admin
Every action (except `headers`): `requireSession` (cookie verified, role re-read from Firestore, revoked users refused) and the D1 check. `get`, `save`, `delete`, `imageUpload` and `imageGet` load `blog_posts/{id}`; if it does not exist **or** `authorEmail !== caller` and the caller's role is not `admin`, the answer is 404 (indistinguishable). The admin keeps the original `authorEmail` on save (never taken from the request body). `list` returns `{ posts, canSeeAll }`: own posts for everyone; `scope: 'all'` is honored only for admin (others get their own only, silently, because the UI never offers it), with `authorEmail` included only in the admin-all view. `maxPostsPerAuthor` (default 200) is a safety limit checked with a Firestore count before create (not a product cap, so a race can exceed it by a few).

### D8. One new function `blog` (owner: reuse functions, no one function per small task)
Approved by the owner with the condition that functions are reused. The whole blog backend is **one** private `onRequest` function `blog` (via `privateEndpoint`, 256 Mi, min instances 0, no idle cost) that dispatches on `body.action`: `list`, `get`, `save` (create when no `id`), `delete`, `imageUpload`, `imageGet`, `headers`. An unknown action is a 400. The session check and permission check run per action inside it (`headers` is the only action that needs no cookie). Config comes through the existing `getConfig` function (no new config function). It is added once to `function_names` in `terraform/functions/functions.tf` and exported once from `functions/src/index.ts`. *Rejected:* seven functions (owner's call), and splitting images into a second function (not needed at 256 Mi for images of at most 5 MB).

### D9. Config `blog-config.json`
`BLOG_CONFIG_FILE` joins `CONFIG_FILES` (`src/data/configFiles.ts` and `functions/src/cms.ts`, always listed in `/admin/cms` with display name "blog-config.json (Blog)"). Typed by `src/data/blogConfig.ts`, example `src/data/blog-config.example.json`, sanitized by `src/lib/blogConfigSanitize.ts`, read by `src/middleware/blogConfigService.ts` with `configLoader` (invalid values replaced by the example's, unreadable -> example).
Keys: `enabled` (default **true**: the section is the feature, and with no published post nothing shows; the owner can switch it off), `writeRoles` (subset of `ROLES`, default `["admin"]`; admin forced in), `homeSampleSize` (1-12, default 3), `maxTitleLength` (default 120), `maxBodyBytes` (default 100000, max 500000), `maxTagsPerPost` (default 8), `maxTagLength` (default 30), `maxImageBytes` (default 2097152, max 5242880), `maxImagesPerPost` (default 10), `maxPostsPerAuthor` (default 200), `excerptLength` (default 160), `home` (`{ heading, intro }` copy for the block). Tags are trimmed, lowercased, de-duplicated. A request over a limit is refused with a clear 400 and stores nothing (checked in the functions with the limits the server forwards, and by the editor for early feedback).

### D10. Client state
Blog data goes through the RTK Query API in `src/store/api.ts` (`listBlogPosts`, `getBlogPost` with `keepUnusedDataFor: 0`, `saveBlogPost`, `deleteBlogPost`, `uploadBlogImage`, `getBlogConfig`, `getBlogHeaders`), tags invalidate the list, and `notifications.ts` `SUCCESS` gets a message for every mutation. No new Redux slice: the editor's working text is local state (like the CMS editor). The editor is Markdown text in a plain `textarea` with a rendered preview tab (a Markdown source is text, not JSON, so the "never a textarea for JSON" rule does not apply), tags input, image upload button that inserts `![name](blog-image:<id>)`, draft/published toggle, delete with confirmation, version-conflict 409 shown with Reload.

## Risks / Trade-offs

- **Config can only widen to roles, not users** (per-user allow lists are out of scope).
- **30 s staleness** of the public pool (D6).
- **Images over JSON/base64** cost ~33% overhead and are bounded to 5 MB by code; acceptable at this scale, no signed upload URLs (they would make a bucket reachable from browsers, which the owner ruled out).
- **Public endpoint** is new attack surface (an unauthenticated request reaches a function through the site). It does one bounded query, exposes headers only, and is cached for 30 s server-side; Cloud Run IAM still blocks direct access to the function.
- **New dependency** `react-markdown` + `remark-gfm` (client bundle only on `/blog`, loaded with `next/dynamic`).
- Terraform changes touch the protected resource types: the bucket is a `create`, which the plan guard allows; a test case is added so a later delete of it is blocked.

## Migration Plan

Stage 1 creates the bucket, stage 2 deploys the `blog` function, stage 3 the app. No data migration. Rollback: set `enabled: false` in `blog-config.json` (routes 404, home block hidden), data is untouched. The bucket and collection are never deleted by a deploy.

## Open Questions

All tier-2 items (D3 Firestore, D4 option A bucket, D5 dependencies, D8 single function) were approved by the owner on 2026-11-18. Still for the PO: admin always holds `blog:write` (D1), 30 s staleness (D6).
