## 1. Stored schema and readers (owner: builder-1)

Files: `src/lib/blogDoc.ts`, `functions/src/blogDoc.ts` (byte-identical copy), `scripts/check-blog-contract.mjs`, `src/components/blog/BlogContent.tsx`, `src/styles/components/blog-content.css`.
Depends on: nothing. Must be merged before groups 2 and 3.

- [ ] 1.1 In `blogDoc.ts` add the constants (`TEXT_COLORS`, `HIGHLIGHT_COLORS`, `IMAGE_SIZES`, `IMAGE_ALIGNS`, `MAX_TABLE_ROWS`, `MAX_TABLE_COLS`), the node types `table`, `tableRow`, `tableHeader`, `tableCell`, `taskList`, `taskItem`, the marks `highlight`, `textColor`, `subscript`, `superscript` (design D1: cell/task content paragraph only, equal cell counts, colspan/rowspan/colwidth only as defaults, no `subscript`+`superscript` together) and the image attributes `size`, `align`, `caption`; update `BlogMark`, `docText` (caption included). Verify: copy to `functions/src/blogDoc.ts` and `diff` is empty.
- [ ] 1.2 Extend `scripts/check-blog-contract.mjs`: accepted documents with every new node, mark and attribute (saved and read back unchanged), and refused ones with the message naming the attribute and value (bad palette id, bad size/align, merged cell, ragged table, 13 columns, nested table, both sub and super, caption over 500, unknown attribute). Verify: `npm run check:blog` passes.
- [ ] 1.3 `BlogContent.tsx`: render tables (`<table>`, `<th scope="col">`, scroll wrapper), task items (disabled read-only checkbox with accessible label), `<sub>`/`<sup>`, highlight and color through `Map` lookup tables, image size/align classes and the caption rule of design D3 (non-empty caption shown, `""` none, null falls back to alt). Never write stored text into class/style/attributes. Verify: `npm run typecheck`, `npm run lint`; an old post renders identically (no new classes when attributes are absent).
- [ ] 1.4 `blog-content.css`: styles for tables, task list, palette custom properties for light, dark and paper reader themes (contrast >= 4.5:1 text, readable on highlight), image size and alignment, caption. Verify: `npm run build`; report the contrast ratios checked.

## 2. Text tools in the editor (owner: builder-2)

Files: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `src/components/blog/RichEditor.tsx`, `src/components/blog/FloatingToolbar.tsx`, `src/components/blog/InsertMenu.tsx`, new `src/components/blog/EditorActionBar.tsx`, new `src/components/blog/blogTextExtensions.ts`, `src/styles/components/blog-editor.css`.
Depends on: group 1 merged (imports the exported constants).

- [ ] 2.1 Add `@tiptap/extension-table`, `@tiptap/extension-list`, `@tiptap/extension-subscript`, `@tiptap/extension-superscript` at `3.34.0` (pnpm and npm lockfiles both updated). Create `blogTextExtensions.ts` with the in-repo `TextColor` and `Highlight` marks (palette id attribute only, parsed from `data-color` never from style), the table cell/header overrides (no stored attributes, content `paragraph`) and the task item override (content `paragraph`, not nested); register everything in `RichEditor.tsx`. Verify: saved JSON of a table, task list and each mark passes `validateDoc`.
- [ ] 2.2 `EditorActionBar.tsx` (`role="toolbar"`, arrow roving, Alt+F10 still reaches the existing toolbar): undo and redo disabled by `editor.can()`, and the table controls (rows above/below, columns left/right, delete row, column, table) visible only while the cursor is in a table. Mount it in `RichEditor.tsx`. Verify: spec scenario "Undo a change"; table add row.
- [ ] 2.3 `FloatingToolbar.tsx`: highlight and text color swatch popovers (named swatches, "Remove" entry, keyboard operable), subscript, superscript. `InsertMenu.tsx`: "Table" (3 x 3 with header row) and "Task list". Verify: apply, save, reopen keeps them; a non-palette color pasted from HTML does not survive.
- [ ] 2.3a `blog-editor.css`: editor styles for tables (selected cell), task list, palette marks, matching group 1's reader classes.
- [ ] 2.4 `npm run check` and `npm run build` pass; manual browser check in light and dark of tables, task list, marks, undo/redo.

## 3. Images (owner: builder-3)

Files: `src/components/blog/BlogEditor.tsx`, `src/store/api.ts`, new `src/components/blog/blogImageExtension.ts`, new `src/components/blog/ImageToolbar.tsx`, new `src/components/blog/UploadStatus.tsx`, new `src/components/blog/useImageUploads.ts`, new `src/components/blog/uploadPlaceholder.ts`, new `src/lib/blogUploadProgress.ts`, `src/components/blog/RichEditor.tsx` (image wiring only), `src/styles/components/blog-editor.css` (image and upload rules only), `src/lib/blogMarkdownImport.ts`.
Depends on: groups 1 and 2 merged (group 2 owns `RichEditor.tsx` and `blog-editor.css` until then).

- [ ] 3.1 Move the image node out of `RichEditor.tsx` into `blogImageExtension.ts`, adding `size`, `align`, `caption` from the whitelists (renderHTML: `<figure>` with fixed class names from lookup tables, `<figcaption>` only for an explicit caption, `data-*` on the `<img>` so copy and paste round-trip; invalid values parse to null). Behavior for existing images unchanged. Verify: an old image post opens and saves identically.
- [ ] 3.2 `ImageToolbar.tsx`: `BubbleMenu` while an image is selected: size, alignment, alt input, caption input (writes `caption: ""` on first use, design D3). Verify: scenarios "Resize and align", "Alt text and caption differ".
- [ ] 3.3 `uploadBlogImage` in `api.ts` becomes a `queryFn` using `XMLHttpRequest` against the same route and body, same `{status, message}` errors (status 0 when unreachable), progress published to `blogUploadProgress.ts` by `uploadId`; the notifications listener and SUCCESS table keep working. Verify: an upload shows a moving bar on a throttled connection; a 4xx shows one error snackbar.
- [ ] 3.4 `useImageUploads` (sequential queue, client pre-checks of type, size and count with "<file name>: <reason>" messages, draft-save-first through the form's `ensureSaved`, insertion at the mapped position) and `uploadPlaceholder.ts` (decoration per upload id, mapped through transactions); `UploadStatus.tsx` (progress, errors, Dismiss, `aria-live`); `BlogEditor.tsx` refactors `requestUpload` into `ensureSaved`, makes the picker `multiple`, and mounts the status region. `RichEditor.tsx`: `handleDrop` (position from `posAtCoords`) and `handlePaste` for image files only, wired through a new `onImageFiles` prop. Verify: scenarios "Drop two images", "Paste an image", "Rejected file", never-saved post.
- [ ] 3.5 Legacy Markdown: `blogMarkdownImport.ts` stops flattening tables and removing task boxes, `scanLegacyMarkdown` stops reporting them, and the notice text in `BlogEditor.tsx` lists only what is still lost; script-check that a Markdown post with a table and a task list converts to a `validateDoc`-valid document (design D6; if not, keep that item flattened and report it).
- [ ] 3.6 `npm run check`, `npm run check:blog` and `npm run build` pass.

## 4. Documentation and integration (owner: architect)

Files: `CLAUDE.md`, `docs/` (only if it mentions the editor), `openspec/changes/blog-editor-full-toolbox/tasks.md`.

- [ ] 4.1 Merge the builder branches in order 1, 2, 3, ticking tasks; review each diff against its file set.
- [ ] 4.2 Update the "Personal blog" section of `CLAUDE.md`: new nodes, marks and attributes and their constants, the palette and lookup tables, the caption rule, the XHR upload endpoint inside the API slice and the progress store, the multi-file queue, the action bar and image toolbar, the legacy-conversion notice change.
- [ ] 4.3 Final `npm run check`, `npm run check:blog`, `npm run build`, `openspec validate blog-editor-full-toolbox --strict`; tell the PO the change is ready for testing.
