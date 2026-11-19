## 1. Document schema and validation (builder-1; merge first)

File set: `src/lib/blogDoc.ts`, `functions/src/blogDoc.ts` (byte-identical), `scripts/check-blog-contract.mjs`.

- [ ] 1.1 Add `ALIGN_VALUES`, `BULLET_STYLES`, `ORDERED_STYLES`; allow `textAlign` on paragraph/heading and `listStyle` on bulletList/orderedList; refuse other values with `The post content is not valid (<attribute> "<value>" is not allowed).` (value truncated to 20 characters, control characters removed). Verify: `diff` of the two files is empty.
- [ ] 1.2 Image node `{ src, alt }`: export `isHttpsImageUrl`, `stripLegacyImages`; `validateDoc(raw, limits?: { maxImageUrlLength?: number })` refuses a non-https, relative, data, javascript, userinfo or over-long URL with a clear message and silently drops legacy `{ imageId }` image nodes. Verify: below.
- [ ] 1.3 Extend `check-blog-contract.mjs`: valid/unknown alignment and list values, script text in attrs refused, https accepted, `http`/`javascript:`/`data:`/relative/over-long refused, legacy `imageId` node dropped, old docs unchanged. Verify: `npm run check:blog` passes.

## 2. Server side: function, config, routes, access (builder-2, after 1 is merged)

File set: `functions/src/blog.ts`, `functions/src/blogValidation.ts`, `src/data/blogConfig.ts`, `src/data/blog-config.example.json`, `src/lib/blogConfigSanitize.ts`, `src/app/api/blog/config/route.ts`, `src/lib/access.ts`, `src/proxy.ts`, `src/app/api/blog/[id]/images/` (delete), `src/app/api/posts/[id]/images/` (delete).

- [ ] 2.1 Remove `imageUpload`/`imageGet`/`publicImageGet`, `checkImage`, `detectImageType`; stop returning `images`/`imageCount` and ignore `removeImageIds`; keep `delete` removing the post's objects; pass `config` to `validateDoc`. Verify: `npm run functions:build`, `npm run check:blog`.
- [ ] 2.2 Config: add `maxImageUrlLength` (default 2000, 20 to 8000) to types, example, sanitizer, public config route and function limits; drop `maxImageBytes`/`maxImagesPerPost` but let an old stored file load with them ignored. Verify: load an old-shaped config through the sanitizer (script or quick node run) and see no error.
- [ ] 2.3 Delete the two image routes and the public image pattern; add `isRemovedImageRoute` in `access.ts` and answer 404 for it in `proxy.ts` before the session check. Verify: anonymous and signed-in requests to both former routes answer 404 (scenario "Former image route"); `/posts/<id>` still public.

## 3. Editor, client types and API (builder-3, after 1 is merged)

File set: `src/components/blog/RichEditor.tsx`, `src/components/blog/EditorToolbar.tsx`, `src/components/blog/BlogEditor.tsx`, `src/lib/blogTypes.ts`, `src/lib/blogResponses.ts`, `src/store/api.ts`, `src/middleware/blogService.ts`, `package.json` and lockfiles.

- [ ] 3.1 Remove upload UI, `uploadBlogImage` (RTK and service), `BlogImage`/`images`/`removeImageIds` from types and responses, `unwrapImage`; the editor's save no longer sends images. Strip legacy image nodes before loading a post into the editor. Verify: `npm run check`; scenario "Open an older post with an uploaded image".
- [ ] 3.2 Inline image by URL: toolbar form (URL, alt), `src`/`alt`-only image extension, https-only parse and input rule, `no-referrer`, validation message identical to the server's with `maxImageUrlLength` from the config. Verify: scenarios "Insert an image by URL", "refused URL" (`http`, `javascript:`, `data:`, relative), `npm run check`.
- [ ] 3.3 Alignment and list style: add `@tiptap/extension-text-align` (exact version, both lockfiles), toolbar buttons and shortcuts, list-style select, `listStyle` attr on list nodes, using the constants from `blogDoc.ts`. Verify: scenarios "Align and reopen", "Style a bulleted list", "Style a numbered list".

## 4. Rendering and reader options (builder-4, after 1 is merged)

File set: `src/components/blog/BlogContent.tsx`, `src/components/blog/BlogView.tsx`, `src/components/blog/BlogPreview.tsx`, `src/app/posts/[id]/page.tsx`, new `src/components/blog/ReaderFrame.tsx`, `ReaderControls.tsx`, `src/lib/readerPrefs.ts`, `src/styles/components/blog-content.css`, `src/index.css`.

- [ ] 4.1 `BlogContent`: render `<img>` only for `isHttpsImageUrl(src)` with attributes `src`, `alt`, `loading`, `decoding`, `referrerPolicy` only; skip legacy image nodes; drop the `imageUrl` prop and its callers; `BlogPreview` drops `blog-image:` mapping (no remote images, as before); map whitelisted `textAlign`/`listStyle` to classes by lookup, never raw values. Verify: scenarios "Alignment in the reader", "Post without alignment", "No script through content", "Image cannot load" (alt shows).
- [ ] 4.2 Reader options: `readerPrefs` (`useSyncExternalStore`, keys `blog-reader-theme`, `blog-reader-width`, in-memory fallback), `ReaderFrame`, `ReaderControls`, scoped light/dark/paper styles and compact/wide width, wired into `/posts/[id]` and `BlogView`. Verify: scenarios "Choose a theme", "Stretch the width", "Storage unavailable", "Reader choice does not alter the post"; both site themes, narrow and desktop widths.

## 5. Docs (architect)

File set: `CLAUDE.md`, `README.md` (via `scripts/update-readme.mjs`), `docs/` only if inaccurate, OpenSpec archive.

- [ ] 5.1 Update the CLAUDE.md "Personal blog" section (inline images by URL and the URL rule, removed upload, routes and config keys, whitelist attrs, reader options and their localStorage keys, no CSP note, the unused `<project>-blog` bucket), the access-control mention of the public image route, and the README structure. Run `npm run check`, `npm run build`, `openspec validate --all`; archive after testing.
