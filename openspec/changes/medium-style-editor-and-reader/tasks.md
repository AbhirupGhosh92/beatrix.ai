## 0. Preparation (architect, before any Builder starts)

Owner: `architect`. File set: `src/index.css`, `src/styles/components/blog-reader.css` (new, empty), `src/styles/components/blog-engagement.css` (new, empty).

- [x] 0.1 Create the two empty style files and add their `@import`s after `blog-content.css` in `src/index.css`, so no Builder edits `index.css`. Verify: `npm run build` passes.

Parallel groups 1, 2, 3 and 4 have disjoint file sets and share only the JSON contract in `design.md` D3 and the routes in D5. Group 5 starts after group 4 is merged. Every Builder runs `npm run check` before reporting; groups 1 also runs `npm run check:blog`.

## 1. Backend: engagement actions in the `blog` function (builder-1)

File set: `functions/src/blogEngagement.ts` (new), `functions/src/blog.ts`, `functions/src/blogValidation.ts`, `src/data/blogConfig.ts`, `src/data/blog-config.example.json`, `src/lib/blogConfigSanitize.ts`, `scripts/check-blog-contract.mjs`.

- [ ] 1.1 Config: add `maxCommentLength` (1000, 50-5000), `maxCommentsShown` (50), `maxCommentsPerUserPerPost` (20), `maxCommentsPerPost` (1000), `maxBookmarksPerUser` (200) to the example, the types, `sanitizeBlogConfig`, and `readBlogConfig` in `functions/src/blogValidation.ts` (bad value -> default); expose `maxCommentLength` in the public editor-config subset. Verify: `npm run typecheck`; contract check (1.5) feeds bad values.
- [ ] 1.2 `blogEngagement.ts` + registration in `ACTIONS` of `blog.ts`: actions `engagementGet`, `likeToggle`, `bookmarkToggle`, `bookmarksList`, `commentAdd`, `commentRemove` exactly as in D3 (data model D2, published-only 404 through `loadPublished`, `requireSession(cookie, "site:view")`, anonymous-tolerant `engagementGet`, counters in the same transaction, `userKey` = sha256 of the lowercase email, comment sanitising, lazy bookmark cleanup, explicit public field lists). Update the header comment of `blog.ts` with the new actions. Verify: `npm run functions:build`.
- [ ] 1.3 Rate limits (D4): per-user fixed windows in `blog_rate/{userKey}` inside the write transactions (30 writes/minute, 5 comments/10 minutes), HTTP 429 with the stated message. Verify: contract check calls the pure window helper at, below and over the limit and across a window boundary.
- [ ] 1.4 Post delete (`remove` in `blog.ts`) also `recursiveDelete`s `blog_engagement/{postId}`, failure logged and not thrown. Unpublish keeps data. Verify: code review of the diff plus the contract check on the helper.
- [ ] 1.5 Extend `scripts/check-blog-contract.mjs` (pure helpers only, no emulator): comment sanitising and length in code points (empty, whitespace-only, over-length, control characters, emoji), config fallback, rate-limit window math, and that the public shapers (`engagementGet` comment, bookmark entry) contain none of the keys `authorEmail`, `email`, `userKey` and no value containing `@` for an email-like input. Verify: `npm run check:blog` passes.

Scenarios covered: Like toggles, Bookmarks, Unpublished post, Comment, Comment removal, No private data (server side).

## 2. Next.js server: routes, access policy, service (builder-2)

File set: `src/middleware/blogService.ts`, `src/middleware/routeHelpers.ts`, `src/lib/access.ts`, `src/proxy.ts`, `src/app/api/posts/[id]/engagement/route.ts`, `src/app/api/posts/[id]/like/route.ts`, `src/app/api/posts/[id]/bookmark/route.ts`, `src/app/api/posts/[id]/comments/route.ts`, `src/app/api/posts/[id]/comments/[commentId]/route.ts`, `src/app/api/bookmarks/route.ts`.

- [x] 2.1 `blogService.ts`: functions `getEngagement(cookie|null, id)`, `toggleLike`, `toggleBookmark`, `addComment`, `removeComment`, `listBookmarks` calling the new actions with the cookie and the blog config (same pattern as the existing calls; response types exported for the browser copies in group 4). Verify: `npm run typecheck`.
- [x] 2.2 `access.ts`: add the anchored public pattern for `GET /api/posts/<id>/engagement` only; widen `isBlogRoute` to the non-public engagement routes, `/api/bookmarks` and `/bookmarks` so `enabled: false` answers 404; keep `ROUTE_PERMISSIONS` for `/api/blog` and `/blog` unchanged; confirm `requiredPermission` gives the new write routes and `/bookmarks` the default `site:view`. Update the policy comments. Verify: `npm run typecheck` and a node one-liner (strip-types) over `isPublicPath`/`requiredPermission`/`isBlogRoute` for each new path, the old public paths, `/api/posts/x/like` (not public) and a malformed id; paste the output in the report.
- [x] 2.3 (HTTP status checks deferred to integration 6.1) Routes per D5. The public GET: tolerant cookie (bad cookie = anonymous), `enabled` check -> 404, `Cache-Control: no-store`. Write routes: session required (`401` without), `enabled` check, JSON bodies read defensively (`text` must be a string), errors through `failure`. A helper in `routeHelpers.ts` for "any signed-in user" next to `blogGuard`. Verify: `npm run check` and `npm run build`; with the dev server (functions not reachable locally is acceptable): anonymous `POST like` -> 401, `GET engagement` for a malformed id -> 404 (not a redirect), `/api/blog/config` still needs `blog:write`; report the status codes.

Scenarios covered: Anonymous reader (server side), Unpublished post, No private data (route layer), existing public paths unchanged.

## 3. Editor canvas (builder-3)

File set: `src/components/blog/RichEditor.tsx`, `src/components/blog/EditorToolbar.tsx` (replaced by the floating toolbar; may be split into `FloatingToolbar.tsx` / `InsertMenu.tsx`, new files in `src/components/blog/`), `src/components/blog/BlogEditor.tsx`, `src/components/blog/CharCounter.tsx`, `src/styles/components/blog-editor.css`.

- [ ] 3.1 Floating toolbar (D8): `BubbleMenu` on selection with bold, italic, link (existing form and `normalizeLink`), H2/H3, block quote, bullet/numbered list with the style whitelists, alignment; below the selection on coarse pointers; `role="toolbar"`, `Alt+F10` focus and `Escape` back, arrow-key roving. Remove the fixed toolbar. Verify: `npm run check`; browser check (dev server, `/blog` as an author or the closest reachable state): select text with mouse and with Shift+arrows, each control formats the selection; Tab/Alt+F10 reach it; at 375px width the toolbar stays on screen.
- [ ] 3.2 Insert menu: `FloatingMenu` "+" on an empty paragraph with image (existing Upload / By URL and draft-save behavior unchanged), horizontal rule, list, numbered list, block quote; keyboard and touch operable. Verify: browser check, each item inserts at that line; image by URL still validates `isHttpsImageUrl`.
- [ ] 3.3 Canvas: large auto-growing serif title field and serif body column (system serif stack from D9), counters and limits unchanged, shortcuts hint, light and dark themes, 320px. Verify: open a post saved before this change (legacy Markdown and a #141 doc post with alignment, list styles and images): content intact and the document JSON sent on save still passes `npm run check:blog` rules (no new node or attribute types); limits still show errors when exceeded.

Scenarios covered: Floating toolbar on selection, Keyboard and touch, Existing content and limits, Insert menu on an empty line.

## 4. Engagement UI, state and bookmarks page (builder-4)

File set: `src/store/api.ts`, `src/store/notifications.ts`, `src/lib/blogTypes.ts`, `src/components/blog/PostEngagement.tsx` (new, default export taking `{ postId: string }`), `src/components/blog/CommentSection.tsx` (new), `src/components/blog/BookmarksPage.tsx` (new), `src/app/bookmarks/page.tsx` (new), `src/components/layout/DrawerMenu.tsx`, `src/data/profile.example.json`, `src/data/profile.ts` (only if the icon vocabulary needs `bookmark`), `src/styles/components/blog-engagement.css`.

- [x] 4.1 RTK Query endpoints and types for the six calls of D3/D5 (tags, optimistic like/bookmark with rollback, invalidate on sign in/out), `SUCCESS` messages for comment add/remove and none for like/bookmark. No `fetch` in a component. Verify: `npm run check`.
- [x] 4.2 (browser checks deferred: not mounted until 5.1) `PostEngagement`: like and bookmark buttons with counts (like count public; no bookmark count), comment count, `CommentSection` (list newest first with author name and date, "Load older", plain-text rendering with `whitespace-pre-wrap`, composer with live `n / max` counter and a clear message for an empty or over-length comment, remove control shown only when `canRemove`, confirm before removing). Anonymous: counts and comments visible, controls replaced by a "Sign in to like, save or comment" prompt with `ui/GoogleSignIn`. Accessible names, `aria-pressed` on toggles, 320px layout, both themes, no Medium icons or wording (lucide only). Verify: `npm run check`, browser check of the anonymous state on a published post and, if a signed-in session is reachable, like/unlike, bookmark, add and remove a comment.
- [x] 4.3 `/bookmarks` page and entry points (D6): list cards linking to `/posts/<id>`, unbookmark control, empty state, skeleton and error state; `bookmark` icon in the drawer icon map and a `bookmarks` entry in `profile.example.json` (`enabled: true`, `/bookmarks`). Verify: `npm run build` lists the route; anonymous visit redirects to `/` through the proxy.

Scenarios covered: Like toggles, Anonymous reader, Bookmarks, Comment, Comment removal.

## 5. Reader layout (builder-5, after group 4 is merged)

File set: `src/app/posts/[id]/page.tsx`, `src/components/blog/BlogContent.tsx`, `src/components/blog/BlogView.tsx`, `src/components/blog/ReaderFrame.tsx`, `src/components/blog/ReaderControls.tsx`, `src/lib/readTime.ts` (new), `src/styles/components/blog-reader.css`, `src/styles/components/blog-content.css`.

- [ ] 5.1 `readTime.ts` (D9) and the page header: large title, byline (author name, publish date, "N min read"), tags, then the article; mount `<PostEngagement postId>` under the article and a "Saved" link for signed-in viewers. Verify: `npm run check`; browser check of a doc post and a legacy Markdown post: both show byline and read time.
- [ ] 5.2 Reading column and typography in `blog-reader.css` (system serif, compact about 42rem, `wide` option kept, theme options kept, `overflow-wrap: anywhere`, images `max-width: 100%`); `BlogContent` renders `figure`/`figcaption` for an image with alt text without changing the `img` attributes or any other rendering; `BlogView` (the author's read-only view) gets the same column. Verify: browser check at 320px, 375px and desktop in light and dark with each reader theme and both widths: no horizontal scroll, the choice is remembered after a reload; an image with alt shows a caption, one without does not.

Scenarios covered: Byline, Reader options kept, Narrow screens.

## 6. Integration, docs and verification (architect)

Owner: `architect`. File set: `CLAUDE.md`, `docs/` files that mention the blog, `README.md` (only if the generated sections change), merge fixes anywhere.

- [ ] 6.1 After all groups are merged: `npm run check`, `npm run check:blog`, `npm run build`, `openspec validate medium-style-editor-and-reader --strict`; fix merge issues.
- [ ] 6.2 Docs to update: `CLAUDE.md` (Personal blog section: engagement actions and data model, rate limits, public engagement route and `/bookmarks`, floating toolbar and insert menu, reader layout and serif stack, new config keys, the stored-profile note for the `bookmarks` drawer entry); `docs/DEPLOYMENT.md` only if a pipeline or Terraform file changed (none is expected: state this in the report); `README.md` via `scripts/update-readme.mjs` if the structure sections change. The proposal's spec delta is merged into `openspec/specs/blog/spec.md` by `/opsx:archive` (PO flow) before the PR is ready.
