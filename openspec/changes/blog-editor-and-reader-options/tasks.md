## 1. Image upload: reproduce, record, fix (builder-1)

File set: `src/middleware/cloudFunctions.ts`, `src/middleware/blogService.ts`, `src/app/api/blog/[id]/images/route.ts`, `src/components/blog/BlogEditor.tsx`, `src/components/blog/EditorToolbar.tsx`, `functions/src/blogValidation.ts`, `scripts/` (a repro script, not committed unless useful), `design.md` (only the root-cause section).

- [ ] 1.1 Reproduce locally per design.md (stand-in function using real `checkImage`/`imageUpload`; png, jpeg, webp, gif, 2 MiB, over limit, wrong type, new vs saved post) and record the confirmed cause under "Image upload: root cause". Verify: the section states observed behavior. **Stop and report to the Architect if the cause needs a cloud resource, IAM or secret.**
- [ ] 1.2 Fix the confirmed cause(s) only: per-call timeout for `imageUpload` with a clear timeout message, specific errors for type, size and unreachable server, visible reason when upload is unavailable (new unsaved post, image limit). Verify: scenarios "Upload an allowed image", "Wrong type or too large", "Upload failure" by hand and `npm run check`.

## 2. Document schema and server validation (builder-2)

File set: `src/lib/blogDoc.ts`, `functions/src/blogDoc.ts`, `scripts/check-blog-contract.mjs`.

- [ ] 2.1 Add `ALIGN_VALUES`, `BULLET_STYLES`, `ORDERED_STYLES`, allow `textAlign` on paragraph/heading and `listStyle` on bulletList/orderedList, refuse other values with the message from design.md; keep both files byte-identical. Verify: `diff` empty, `npm run check:blog`.
- [ ] 2.2 Extend `check-blog-contract.mjs` with cases: each valid value accepted, unknown value, `style`/script text in an alignment or list attr refused, old doc without attrs unchanged. Verify: `npm run check:blog` passes.

## 3. Editor: alignment and list styling (builder-3, after 2 is merged)

File set: `src/components/blog/RichEditor.tsx`, `src/components/blog/EditorToolbar.tsx`, `package.json`, lockfiles. (Task 1 also edits `EditorToolbar.tsx`: group 3 starts after group 1 is merged.)

- [ ] 3.1 Add `@tiptap/extension-text-align` (exact version, pnpm and npm lockfiles), toolbar alignment buttons and shortcuts, list-style select, `listStyle` attr on list nodes. Verify: scenarios "Align and reopen", "Style a bulleted list", "Style a numbered list" in `npm run dev`; `npm run check`.

## 4. Rendering and reader options (builder-4, after 2 is merged)

File set: `src/components/blog/BlogContent.tsx`, `src/components/blog/BlogView.tsx`, `src/app/posts/[id]/page.tsx`, new `src/components/blog/ReaderFrame.tsx`, `ReaderControls.tsx`, `src/lib/readerPrefs.ts`, `src/styles/components/blog-content.css`, `src/index.css`.

- [ ] 4.1 `BlogContent` maps whitelisted attrs to classes by lookup (never raw values), unknown ignored; legacy Markdown path untouched. Verify: scenarios "Alignment in the reader", "Post without alignment", "No script through content".
- [ ] 4.2 `readerPrefs`, `ReaderFrame`, `ReaderControls`, paper/light/dark scoped styles, compact/wide width; wire into `/posts/[id]` and `BlogView`. Verify: scenarios "Choose a theme", "Stretch the width", "Storage unavailable", "Reader choice does not alter the post" (block storage in devtools), both site themes, narrow and desktop widths.

## 5. Docs (architect)

File set: `CLAUDE.md`, `README.md` (structure section via `scripts/update-readme.mjs`), `openspec/` archive.

- [ ] 5.1 Update the CLAUDE.md "Personal blog" section (new attrs and whitelist, reader options and their localStorage keys, the upload fix), regenerate the README structure section, run `npm run check`, `npm run build`, `openspec validate --all`, and archive the change after testing.
