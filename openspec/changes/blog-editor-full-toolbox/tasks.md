## Order

Groups 1 and 2 touch disjoint files and run in parallel (builder-1, builder-2). Group 3, then 4, then 5 run one after another after both are merged, because they all edit the editor files group 2 moves. Group 6 is mine.

## 1. Stored schema and readers (owner: builder-1)

Files: `src/lib/blogDoc.ts`, `functions/src/blogDoc.ts` (byte-identical copy), `scripts/check-blog-contract.mjs`, `src/lib/blogColor.ts` (new), `src/components/blog/BlogContent.tsx`, `src/styles/components/blog-content.css`.

- [x] 1.1 `blogDoc.ts` per design D1: constants (`IMAGE_SIZES`, `IMAGE_ALIGNS`, `MAX_TABLE_ROWS`, `MAX_TABLE_COLS`, `HEX_COLOR`, exported `isHexColor`), nodes `table`, `tableRow`, `tableHeader`, `tableCell` (one paragraph; `colspan`/`rowspan` bounds, `colwidth` null only), `taskList`, `taskItem`; whole-grid check; marks `highlight`/`textColor` (`#rrggbb`, rebuilt lowercase), `subscript`, `superscript` (not both); image `size`, `align`, `caption`; `docText` includes captions. Copy to `functions/src/blogDoc.ts`. Verify: `diff` of the two files is empty.
- [x] 1.2 Extend `check-blog-contract.mjs`: every new value accepted and read back unchanged; refused with the message naming attribute and value for: bad hex (`#abc`, `red`, `rgb(0,0,0)`, `#12345g`, alpha), bad size/align, caption over 500, unknown attribute, sub+super; grid matrix: valid merged tables (colspan, rowspan, both), overlap, ragged row, rowspan past the last row, 13 columns, nested table, cell with two paragraphs. Verify: `npm run check:blog` passes.
- [x] 1.3 `src/lib/blogColor.ts`: pure `readableInk(hex)` (`#000000`/`#ffffff` by WCAG luminance). `BlogContent.tsx`: tables (`<th scope="col">`, scroll wrapper, `colSpan`/`rowSpan` from validated numbers), task items (disabled read-only checkbox with accessible label), `<sub>`/`<sup>`, highlight and color by the D2 exception (re-run `isHexColor`, set only `--blog-color`, `--blog-hl`, `--blog-hl-ink` through the React `style` object with the fixed classes `blog-color`/`blog-hl`; highlight outer, color inner in canonical order), image size/align classes through `Map` lookups, caption rule D3. No other stored text into class/style/attributes. Verify: `npm run typecheck`, `npm run lint`; a post without the new attributes renders identically.
- [x] 1.4 `blog-content.css`: styles for tables, task list, `blog-color`, `blog-hl`, image size and alignment, caption, readable in the light, dark and paper reader themes. Verify: `npm run build`; report the contrast ratios checked.

## 2. Move the editor to a host-independent component (owner: builder-2)

Files: new `src/components/editor/` (move with `git mv`: `RichEditor.tsx`, `FloatingToolbar.tsx`, `InsertMenu.tsx`), `src/components/blog/BlogEditor.tsx`, `src/styles/components/blog-editor.css`, new `src/styles/components/rich-editor.css`, `src/index.css`, `src/lib/blogMarkdownImport.ts` (only if its import path must change).
Depends on: nothing. **Behavior must not change.**

- [x] 2.1 Move the editor files, define `RichEditorHost` exactly as in design D7 (types in `src/components/editor/types.ts`; `BlogImage` extension takes `legacyScheme` and `imageUrl` from it instead of importing `blogTypes` and `getPostId`), and make the editor files import nothing from `components/blog`, `store/` or blog types. Verify: `grep -rE "components/blog|store/|blogTypes" src/components/editor` finds nothing except the `blogDoc.ts` whitelist import.
- [x] 2.2 Make `BlogEditor.tsx` the blog host (RTK upload endpoint, blog limits, `ensureSaved` from the existing `requestUpload` draft-save flow, `imageUrl`), keeping title, tags, counters, save, delete, publish, conflict and the legacy notice as they are.
- [ ] 2.3 Move the non-blog-specific editor rules to `rich-editor.css`, import it after `blog-editor.css` in `src/index.css` keeping the cascade order. Verify: `npm run check` and `npm run build`; manual check in light and dark that the editor, floating toolbar, insert menu, image upload (picker and URL) and a legacy Markdown post look and work as before; report it. (code merged; manual browser check still open, done with 3.4)

## 3. Text tools (owner: builder-3)

Files: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `src/components/editor/RichEditor.tsx`, `FloatingToolbar.tsx`, `InsertMenu.tsx`, new `EditorActionBar.tsx`, new `blogTextExtensions.ts` (in `src/components/editor/`), `src/styles/components/rich-editor.css`.
Depends on: groups 1 and 2 merged.

- [ ] 3.1 Add `@tiptap/extension-table`, `@tiptap/extension-list`, `@tiptap/extension-subscript`, `@tiptap/extension-superscript` at `3.34.0` in `package.json` and both lockfiles. `blogTextExtensions.ts`: in-repo `TextColor` and `Highlight` marks (attribute `color` only, `parseHTML` reads only a `data-color` that passes `isHexColor`, `renderHTML` emits `data-color` and the D2 custom properties with the fixed classes; Highlight priority above TextColor), table cell/header overrides (content one paragraph, attributes only `colspan`/`rowspan`, no `colwidth`, no resizing), task item override (one paragraph, not nested); register in `RichEditor.tsx`. Verify: a saved table, merged table, task list and every mark pass `validateDoc`.
- [ ] 3.2 `EditorActionBar.tsx` (`role="toolbar"`, arrow roving; Alt+F10 still reaches the other toolbars): undo, redo (disabled by `editor.can()`), and in a table add row above/below, add column left/right, delete row, delete column, delete table, merge cells, split cell (each disabled when not possible). Verify: scenarios "Undo a change", "Insert and edit a table", "Merge cells".
- [ ] 3.3 `FloatingToolbar.tsx`: highlight and text color popovers (named preset swatches from `COLOR_PRESETS`, a native color input for the free choice, "Remove"), subscript, superscript. `InsertMenu.tsx`: "Table" (3 x 3 with header row), "Task list". Verify: scenarios "Apply a preset color", "Apply a free color", "Superscript", "Check an item"; a color pasted as HTML `style` does not survive.
- [ ] 3.4 Editor styles for tables (selected cells), task list, colors, highlight, sub/sup in `rich-editor.css`, matching group 1's reader classes. Verify: `npm run check`, `npm run build`, light and dark manual check.

## 4. Image upload: drop, paste, multi-file, progress (owner: builder-4)

Files: `src/store/api.ts`, `src/components/blog/BlogEditor.tsx`, `src/components/editor/RichEditor.tsx` (drop/paste wiring and status slot only), new in `src/components/editor/`: `useImageUploads.ts`, `uploadPlaceholder.ts`, `UploadStatus.tsx`; new `src/lib/blogUploadProgress.ts`; `src/styles/components/rich-editor.css` (upload rules only).
Depends on: group 3 merged.

- [ ] 4.1 `uploadBlogImage` in `api.ts` becomes a `queryFn` using `XMLHttpRequest` to the same route and body, errors mapped to the same `{status, message}` (0 when unreachable), progress published to `blogUploadProgress.ts` by `uploadId`; the notification listener and SUCCESS table still work. Verify: a moving bar on a throttled connection; a 4xx gives exactly one error snackbar.
- [ ] 4.2 `useImageUploads` (sequential queue, pre-checks per design D5 with "<file name>: <reason>", `ensureSaved` before the first file, insertion at the mapped position), `uploadPlaceholder.ts`, `UploadStatus.tsx` (`aria-live`), `handleDrop` (`posAtCoords`) and `handlePaste` for image files only in `RichEditor.tsx`, the picker made `multiple` in the blog host. Verify: scenarios "Drop two images", "Paste an image", "Rejected file", a never-saved post, typing while an upload runs.
- [ ] 4.3 `npm run check`, `npm run check:blog`, `npm run build` pass.

## 5. Image controls and editing (owner: builder-5)

Files: new in `src/components/editor/`: `blogImageExtension.ts` (image node moved out of `RichEditor.tsx`), `ImageToolbar.tsx`, `ImageEditor.tsx`, `imageTransform.ts`; `src/components/editor/RichEditor.tsx` (mount and the `editedFrom` map only), `src/components/blog/BlogEditor.tsx` (`onReplaced` and the save-time removal only), `src/lib/blogMarkdownImport.ts`, `src/styles/components/rich-editor.css` (image and dialog rules only).
Depends on: group 4 merged.

- [ ] 5.1 `blogImageExtension.ts`: `size`, `align`, `caption` from the whitelists (invalid values parse to null), `renderHTML` as `<figure>` with fixed class names from lookup tables, `<figcaption>` only for an explicit caption, `data-*` on the `<img>` so copy and paste round-trip. Existing images behave as before. Verify: an old image post opens and saves identically.
- [ ] 5.2 `ImageToolbar.tsx`: size, alignment, alt, caption (writes `caption: ""` on first use, D3), "Edit image" for uploaded images only. Verify: scenarios "Resize and align", "Alt text and caption differ".
- [ ] 5.3 `imageTransform.ts` (pure canvas functions: rotate, flip, crop, encode as the source type, 8000 px cap) and `ImageEditor.tsx` (native `<dialog>`, preview, rotate left/right, flip H/V, crop box with pointer and keyboard, Reset to the root, Apply/Cancel). Apply uploads through the existing path and swaps `imageId` in place, keeping size, align, alt and caption; GIF disabled with a reason; any failure leaves the image unchanged with a message. Verify: scenarios "Crop an image", "Edit fails" (force a limit and a network failure), Reset, Ctrl+Z after an edit.
- [ ] 5.4 Replaced-image bookkeeping per D6: `editedFrom` map in the editor, `onReplaced` to the host, and on save the host adds every replaced id that the saved document no longer references to `removeImageIds`; clear the map after a save. Verify: after save the originals are gone from the Images panel and storage; before save Reset works; at the image limit an edit shows the limit message.
- [ ] 5.5 Legacy Markdown (D8): `blogMarkdownImport.ts` stops flattening tables and removing task boxes, `scanLegacyMarkdown` stops reporting them, the notice in `BlogEditor.tsx` lists only raw HTML and remote images; script-check the converted document with `validateDoc` (fall back per D8 if invalid).
- [ ] 5.6 `npm run check`, `npm run check:blog`, `npm run build` pass; manual browser check in light and dark at narrow and desktop widths.

## 6. Documentation and integration (owner: architect)

Files: `CLAUDE.md`, `docs/` (only if it mentions the editor), this `tasks.md`.

- [ ] 6.1 Merge builder branches in order, tick tasks, review each diff against its file set; I merge 1 and 2 together and then each later group.
- [ ] 6.2 Update the "Personal blog" section of `CLAUDE.md` and the Component layout line: the new nodes, marks, attributes and constants, the `#rrggbb` custom-property exception to the class/style rule, merged cell grid rule, the caption rule, the XHR upload endpoint and progress store, the upload queue, the action bar, image toolbar and image editor with `editedFrom`, the shared `components/editor/` and the `RichEditorHost` contract, the legacy notice change.
- [ ] 6.3 Final `npm run check`, `npm run check:blog`, `npm run build`, `openspec validate blog-editor-full-toolbox --strict`; tell the PO the change is ready for testing.
