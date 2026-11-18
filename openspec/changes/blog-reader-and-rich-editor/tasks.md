## Plan and ownership

Phase 1 (one builder), then phase 2 (two builders in parallel, merged by the Architect), then docs and checks. File sets never overlap. Contracts between groups are in `design.md` (D3 module API, D6 function actions and the `BlogContent` props `{ doc | markdown, imageUrl: (imageId: string) => string }`, D9 types).

## 1. Backend and shared document module (owner: builder-1; phase 1)

Files: `src/lib/blogDoc.ts`, `functions/src/blogDoc.ts`, `functions/src/blog.ts`, `functions/src/blogValidation.ts`, `functions/src/users.ts`, `scripts/check-blog-contract.mjs`, `src/lib/blogResponses.ts`.

- [x] 1.1 Write `src/lib/blogDoc.ts` (D3) and copy it byte-for-byte to `functions/src/blogDoc.ts`; add a `diff` check to `scripts/check-blog-contract.mjs`. Verify: `npm run check:blog` passes and fails when one copy is edited.
- [x] 1.2 `blogValidation.ts`: `maxBodyLength` (default 50 000, hard max 200 000), legacy `maxBodyBytes` derivation, code-point counting for title, body and tags, messages in characters, `MAX_DOC_BYTES`. Verify: contract cases for an over-limit title, body and tag, and for a config with only `maxBodyBytes`.
- [x] 1.3 `blog.ts`: `save` accepts `content` (validated, `format: "doc"`, excerpt from the document, original `body` kept) or the legacy `body`; `get`/`save` return `format`, `content`/`body`; `headers` returns `authorName`; new `publicGet` and `publicImageGet`; author name resolution with `getAll` and the fallback (D1, D6); update the header comment. Verify: contract cases for every Requirement scenario (public read, draft 404, deleted 404, malformed id 404, no `authorEmail` or `@` in any public response, hostile document rejected, Markdown post still readable and savable).
- [x] 1.4 `users.ts` `registerIfAbsent`: write `displayName` only when the stored one is empty (D1; optional, skip if the PO reports a veto). Verify: note in the report that role and `allowed` are untouched.
- [x] 1.5 `src/lib/blogResponses.ts`: `unwrapPublicPost`, `unwrapHeaders` with `authorName`. Verify: the contract script passes responses through them.
- Done when: `npm run functions:build`, `npm run check:blog` and `npm run check` pass.

## 2. Config, server layer, public page, renderer, home (owner: builder-2; phase 2, after group 1 is merged)

Files: `src/data/blogConfig.ts`, `src/data/blog-config.example.json`, `src/lib/blogConfigSanitize.ts`, `src/lib/blogTypes.ts`, `src/lib/access.ts`, `src/proxy.ts` (only if needed), `src/middleware/blogService.ts`, `src/app/api/blog/config/route.ts`, `src/app/api/posts/**`, `src/app/posts/**`, `src/components/blog/BlogContent.tsx`, `src/components/blog/BlogPreview.tsx` (becomes the legacy Markdown renderer, `'use client'` dropped), `src/components/sections/LandingBlog.tsx`, `src/store/api.ts`, `src/styles/components/blog.css` (prose styles only).

- [x] 2.1 Config: `maxBodyLength` replaces `maxBodyBytes` in the type, `BLOG_LIMITS`, example, `BlogEditorConfig` and `/api/blog/config`; the sanitizer derives from a legacy `maxBodyBytes` with a warning (D5); `limits()` in `blogService.ts` forwards `maxBodyLength`. Verify: a small node script on the sanitizer with (a) the new key, (b) the legacy key only, (c) both invalid; results in the report.
- [x] 2.2 `access.ts` `isPublicPostPath` (anchored regexes, D6) wired into `isPublicPath`; anonymous `/blog` still redirects and `/api/blog/*` is still 401. Verify: node check of the path function with positive and negative paths (`/posts/<uuid>`, `/posts/x`, `/posts/<uuid>/x`, `/api/posts/<uuid>`, `/api/blog/<uuid>`).
- [x] 2.3 `blogService.ts`: `getPublicBlogPost` (30 s, 50-entry cache, published only) and `getPublicBlogImage`; `blogTypes.ts` (`format`, `content`, `authorName`); `src/store/api.ts` types. Verify: `npm run typecheck`.
- [x] 2.4 `BlogContent` renderer (D6) including the legacy Markdown path, server-usable. Verify: hostile fixtures (script text, `onerror`, `javascript:` link, remote image, unknown node) render inert; check in the browser with a seeded document.
- [x] 2.5 `/posts/[id]` page (404 when off or missing, title metadata, link back to the site, same chrome style as the home page) and `/api/posts/[id]/images/[imageId]` route (D6 headers). Verify in the browser: a published post renders, a draft or unknown id gives 404, blog off gives 404, no author email in the HTML.
- [x] 2.6 `LandingBlog`: author line and link to `/posts/<id>` (D8). Verify in the browser.
- Done when: `npm run check` and `npm run build` pass; screenshots for the PR (home with author, post page, light and dark, mobile).

## 3. Rich-text editor and author views (owner: builder-3; phase 2, parallel with group 2)

Files: `package.json`, lockfiles, `src/components/blog/BlogEditor.tsx`, `src/components/blog/RichEditor.tsx` (new), `src/components/blog/EditorToolbar.tsx` (new), `src/components/blog/BlogView.tsx` (new), `src/components/blog/BlogList.tsx`, `src/components/blog/BlogPage.tsx`, `src/components/blog/CharCounter.tsx` (new), `src/lib/blogMarkdownImport.ts` (new), `src/styles/components/blog-editor.css` (new, imported in `src/index.css`).

- [ ] 3.1 Install Tiptap (D4) with pnpm and npm lockfiles current; `RichEditor` loaded by `next/dynamic` inside `BlogEditor` only; schema limited to the D2 nodes and marks. Verify: `/blog` bundle size before and after recorded; `/` and `/posts/*` do not load Tiptap (network check).
- [ ] 3.2 Toolbar (headings, bold, italic, underline, strike, bullet, numbered, quote, inline code, code block, link, horizontal rule, image, undo, redo) with `aria-label`s and active state, bubble menu on selection, keyboard shortcuts and Markdown input rules. Verify in the browser: each action formats while typing; after Save and reopen the same formatting shows.
- [ ] 3.3 Image button uploads through the existing mutation and inserts an `image` node with `imageId`; removed images are sent in `removeImageIds` on save as today. Verify: upload, reopen, remove.
- [ ] 3.4 Legacy Markdown import (D2): convert on open, pre-scan and show the notice for tables, task lists, raw HTML and remote images; save sends `content`. Verify: open a seeded Markdown post, confirm content intact and the notice, save, reopen.
- [ ] 3.5 `CharCounter` for title, body, tags per post and the tag being typed (D5); Save disabled when over a limit with a message naming it; image limit shown in MB/KB. Verify: type past each limit.
- [ ] 3.6 `BlogView` read-only view with Edit and "Open public page"; View and Edit on `BlogList` rows; `BlogPage` state for view and edit. Verify in the browser: a draft is visible to its author only.
- Done when: `npm run check` and `npm run build` pass; light/dark and 375 px screenshots for the PR.

## 4. Docs, specs and final checks (owner: architect; after groups 1-3 are merged)

Files: `CLAUDE.md`, `README.md` (generated sections via `scripts/update-readme.mjs`), `docs/DEPLOYMENT.md` only if a pipeline fact changed (not expected), `openspec/changes/blog-reader-and-rich-editor/**`.

- [ ] 4.1 Update the `CLAUDE.md` blog, landing and access-control passages (rich-text storage, `/posts` public routes, characters, author name) and the README structure sections.
- [ ] 4.2 Run `openspec validate --all`, `npm run check`, `npm run build`, `npm run check:blog`; report to the PO that the change is ready for testing. Archive with `/opsx:archive` when the PO asks (before the PR is ready).
