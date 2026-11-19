## 1. Document schema and validation (builder-1; merge first)

File set: `src/lib/blogDoc.ts`, `functions/src/blogDoc.ts` (byte-identical), `scripts/check-blog-contract.mjs`.

- [x] 1.1 Add `ALIGN_VALUES`, `BULLET_STYLES`, `ORDERED_STYLES`; allow `textAlign` on paragraph/heading and `listStyle` on bulletList/orderedList; refuse other values with `The post content is not valid (<attribute> "<value>" is not allowed).` (value truncated to 20 characters, control characters removed). Verify: `diff` of the two files is empty.
- [x] 1.2 Image node with exactly one of `imageId` or `src` (+ optional `alt`): export `isHttpsImageUrl`; `validateDoc(raw, limits?: { maxImageUrlLength?: number })` refuses a non-https, relative, data, javascript, userinfo, over-long URL or a node with both or neither source, with clear messages; uploaded `imageId` nodes validate as before. Verify: below.
- [x] 1.3 Extend `check-blog-contract.mjs`: valid/unknown alignment and list values, script text in attrs refused, https accepted, `http`/`javascript:`/`data:`/relative/over-long refused, both/neither source refused, old docs with `imageId` unchanged. Verify: `npm run check:blog` passes.

## 2. Server side: function and config (builder-2, after 1 is merged)

File set: `functions/src/blog.ts`, `functions/src/blogValidation.ts`, `src/data/blogConfig.ts`, `src/data/blog-config.example.json`, `src/lib/blogConfigSanitize.ts`, `src/app/api/blog/config/route.ts`. Nothing is removed.

- [ ] 2.1 Add `maxImageUrlLength` (default 2000, 20 to 8000) to the config type, example, sanitizer, public config route and function limits; the `blog` function passes its config to `validateDoc` on save. Verify: `npm run functions:build`, `npm run check:blog`; a save with an over-long URL is refused naming the limit; an old config without the key gets the default.

## 3. Editor, first-save flow, alignment and lists (builder-3, after 1 is merged)

File set: `src/components/blog/RichEditor.tsx`, `src/components/blog/EditorToolbar.tsx`, `src/components/blog/BlogEditor.tsx`, `src/components/blog/BlogPage.tsx`, `package.json` and lockfiles.

- [ ] 3.1 Image node in the editor: attrs `imageId`, `src`, `alt`; parse `img[data-image-id]` and `img[src^="https://"]`; render by source; https-only Markdown input rule; `getPostId` ref instead of the frozen `imagePostId`. Verify: `npm run check`; an uploaded and a URL image both show at their position.
- [ ] 3.2 Toolbar image control with Upload and By URL (inline form with https URL and alt, same refusal messages as the server using `maxImageUrlLength`). Verify: scenarios "Image by URL", "URL not accepted" (`http`, `javascript:`, `data:`, relative, over-long).
- [ ] 3.3 Always-usable upload on a new post: run `problems`, save as draft (draft toggle reset), then `showPicker()` in try/catch with the "Draft saved. Choose the image again." fallback; no draft and no picker when checks or save fail. Verify: scenarios "First upload on a new post", "Unsaved post cannot be saved", "Upload failure", "Wrong type or too large".
- [ ] 3.4 Keep the form mounted across the first save: stable `editorKey` in `BlogPage`, `created` post and no refetch skeleton in `BlogEditor` as in design.md. Verify by hand: typed text and the cursor position survive the first-save upload and the image is inserted at the cursor; Reload and opening another post still work.
- [ ] 3.5 Alignment and list style: add `@tiptap/extension-text-align` (exact version, both lockfiles), toolbar buttons and shortcuts, list-style select, `listStyle` attr on list nodes using the constants from `blogDoc.ts`. Verify: scenarios "Align and reopen", "Style a bulleted list", "Style a numbered list".

## 4. Rendering and reader options (builder-4, after 1 is merged)

File set: `src/components/blog/BlogContent.tsx`, `src/components/blog/BlogView.tsx`, `src/components/blog/BlogPreview.tsx` (only if needed), `src/app/posts/[id]/page.tsx`, new `src/components/blog/ReaderFrame.tsx`, `ReaderControls.tsx`, `src/lib/readerPrefs.ts`, `src/styles/components/blog-content.css`, `src/index.css`.

- [ ] 4.1 `BlogContent`: uploaded nodes through `imageUrl`, URL nodes only for `isHttpsImageUrl(src)` with attributes `src`, `alt`, `loading`, `decoding`, `referrerPolicy="no-referrer"` only; whitelisted `textAlign`/`listStyle` mapped to classes by lookup, never raw values; legacy Markdown unchanged. Verify: scenarios "Alignment in the reader", "Post without alignment", "No script through content", "Image cannot load" (alt shows).
- [ ] 4.2 Reader options: `readerPrefs` (`useSyncExternalStore`, keys `blog-reader-theme`, `blog-reader-width`, in-memory fallback), `ReaderFrame`, `ReaderControls`, scoped light/dark/paper styles and compact/wide width, wired into `/posts/[id]` and `BlogView`. Verify: scenarios "Choose a theme", "Stretch the width", "Storage unavailable", "Reader choice does not alter the post"; both site themes, narrow and desktop widths.

## 5. Docs (architect)

File set: `CLAUDE.md`, `README.md` (via `scripts/update-readme.mjs`), OpenSpec archive.

- [ ] 5.1 Update the CLAUDE.md "Personal blog" section (two image sources and the URL rule, `maxImageUrlLength`, always-usable upload and the first-save draft, post id switch without remount, whitelist attrs, reader options and their localStorage keys, no CSP note) and the README structure. Run `npm run check`, `npm run build`, `openspec validate --all`; archive after testing.
