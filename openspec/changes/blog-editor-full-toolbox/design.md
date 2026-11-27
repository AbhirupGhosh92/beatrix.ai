## Context

The blog editor is Tiptap v3 (`RichEditor.tsx`, `FloatingToolbar.tsx` for text selection, `InsertMenu.tsx` on an empty line). A post is stored as a closed JSON document validated by `src/lib/blogDoc.ts` (mirrored byte-for-byte in `functions/src/blogDoc.ts`, checked by `npm run check:blog`) and rendered to React elements by `BlogContent.tsx` through lookup tables; stored text never reaches `class`, `style` or any attribute. Images are uploaded one at a time through `useUploadBlogImageMutation` -> `/api/blog/[id]/images` -> the private `blog` function (type by magic bytes, size and count limits enforced there). The same document is shown in three places that must agree: the editor, the author's read-only view and the public page (all three go through `BlogContent` except the editor).

Everything in the proposal fits the existing architecture. **No new cloud resource, function, secret, config key or API route is needed**; the upload route, the function and the limits stay as they are. New npm dependencies are only Tiptap v3 extension packages (pinned to the same `3.34.0` as the others).

## Goals / Non-Goals

**Goals:** everything in the spec; old posts render and edit exactly as before; the stored format stays a closed whitelist.
**Non-goals:** the proposal's out-of-scope list; wrapping text around images (alignment places the block, it does not float); changes to the server limits or to the upload function.

## Decisions

### D1. Stored schema additions (`blogDoc.ts`, mirrored)
New node types and attributes, all validated and rebuilt field by field like the existing ones; anything else is refused with a message naming the attribute and value (`checkChoice`).

- `table` (children `tableRow` only, 1..`MAX_TABLE_ROWS`=100 rows, every row the same number of cells, 1..`MAX_TABLE_COLS`=12), `tableRow` (children `tableHeader` | `tableCell`), `tableHeader`/`tableCell` (content: `paragraph` only, **no attributes stored**; colspan, rowspan and colwidth are accepted only as their defaults `1`/`1`/`null` and dropped, so merged cells are refused). "Plain text" is read as: no nested blocks; inline marks on the cell text are allowed. Tables are allowed wherever `BLOCKS` is allowed except inside a cell, so they never nest.
- `taskList` (children `taskItem`), `taskItem` (attr `checked`: boolean, default false; content: `paragraph` only, no nesting of task lists in this change).
- Marks: `highlight` (attr `color` in `HIGHLIGHT_COLORS`), `textColor` (attr `color` in `TEXT_COLORS`), `subscript`, `superscript` (no attrs; a text cannot carry both, refused). The palette ids are exported constants in `blogDoc.ts`: `TEXT_COLORS = ['red','orange','green','blue','purple','gray']`, `HIGHLIGHT_COLORS = ['yellow','green','blue','pink','orange']`.
- `image` gains `size` (`IMAGE_SIZES = ['small','medium','full']`), `align` (`IMAGE_ALIGNS = ['left','center','right']`) and `caption` (string up to 500 characters, or null). `alt` keeps its 500-character limit. The exactly-one-of `imageId`/`src` rule is unchanged.
- `docText` includes table cell and task item text (it already recurses) and now includes an image's caption, so the character counter and limit count visible text. `docExcerpt` therefore may show a caption; accepted.
- Defaults are never written: a node without the new attributes is stored exactly as today, so old posts and old saved documents stay byte-identical and valid.

Rejected: reusing Tiptap's own `Color` (`textStyle`) and `Highlight` marks, because they store free CSS color strings; we define two small in-repo marks that store a palette id. Rejected: letting cells hold blocks (needs recursion limits and a larger renderer surface; the spec says plain text).

### D2. Rendering through lookup tables
`BlogContent.tsx` gets Map tables for palette ids and image size/align like `ALIGN_CLASS`: `blog-color-<id>`, `blog-hl-<id>`, `blog-img-size-<id>`, `blog-img-align-<id>`, built from the exported constants (a stored string is never concatenated into a class). Tables render as `<table><tbody>` with header cells as `<th scope="col">`; wide tables scroll inside a wrapper `div`. A task item renders `<li class="blog-task">` with a disabled, read-only `<input type="checkbox">` carrying an accessible label and the text in a sibling element. Sub/superscript render `<sub>`/`<sup>`. Colors are CSS custom properties per palette id in `blog-content.css`, defined for the light, dark and paper reader themes (text >= 4.5:1, highlight keeps text readable), and the same classes style the editor (`blog-editor.css`), so the three places agree. Color is never the only signal: the toolbar swatches have text names.

### D3. Image caption versus alt text (decision, PO to confirm)
Today the reader shows `alt` as a figcaption. New rule: if `caption` is a non-empty string it is shown as the figcaption and `alt` stays only the description; if `caption` is `""` no caption is shown; if `caption` is null/absent (every existing image) the old behaviour stays (alt is shown as the caption), so "renders as before" holds. The image toolbar writes `caption: ""` the first time an author touches the image panel, so alt text edited in the new panel does not suddenly appear as a visible caption. Rejected: dropping the alt-as-caption fallback (changes existing posts).

### D4. Editor structure
`RichEditor.tsx` stays the single owner of the extension list and editor wiring. Extensions: the in-repo `TextColor`/`Highlight` marks and the table and task-list overrides live in a new `blogTextExtensions.ts` (table cells overridden to store no attributes and `content: 'paragraph'`; task items `content: 'paragraph'`, `nested: false`); `@tiptap/extension-table`, `@tiptap/extension-list` (TaskList, TaskItem), `@tiptap/extension-subscript`, `@tiptap/extension-superscript` are added to `package.json`/both lockfiles. The image node extension is extracted from `RichEditor.tsx` into `blogImageExtension.ts` and gains `size`, `align`, `caption`; its `renderHTML` wraps in `<figure>` with fixed class names from lookup tables and an `<figcaption>` only for an explicit caption; attributes sit on the `<img>` as `data-*` so pasted/duplicated nodes parse back.

UI placement (avoids overlapping bubble menus):
- New always-visible `EditorActionBar.tsx` above the content: undo and redo (disabled from `editor.can()`), and, while the cursor is in a table, the table controls (add row above/below, add column left/right, delete row, delete column, delete table). It is a `role="toolbar"` with arrow-key roving like the others.
- `FloatingToolbar.tsx` (text selection) gains highlight, text color (a small swatch popover with a "Remove" entry), subscript, superscript.
- `InsertMenu.tsx` gains "Table" (3 x 3 with header row) and "Task list".
- New `ImageToolbar.tsx`, a `BubbleMenu` shown while an image node is selected: size (3), alignment (3), alt input, caption input. Alignment places the block (margin), it does not wrap text.

### D5. Image upload: drop, paste, multi-file, progress
- Source of files: the toolbar/Images-panel picker (now `multiple`), `handleDrop` and `handlePaste` in the editor's `editorProps`. Drop resolves the position with `view.posAtCoords`; paste and picker use the selection. A non-image paste or drop (text, html) is left to Tiptap.
- A new hook `useImageUploads` (in `src/components/blog/useImageUploads.ts`, used by `BlogForm`) owns a sequential queue (one file at a time, so the per-post count limit is checked in order and the server's answer is authoritative). Per file: client pre-checks with the same limits the form already uses (allowed type by `file.type`, `maxImageBytes`, remaining `maxImagesPerPost` including queued files); a failure shows "<file name>: <reason>" and inserts nothing; the server remains the real check (type by magic bytes). A never-saved post is saved as a draft once, before the first file, through the form's existing path (`ensureSaved`, refactored out of `requestUpload`), then the queue runs; the editor is not remounted, so text and cursor are intact.
- Position: a small ProseMirror plugin (`uploadPlaceholder.ts`) keeps a decoration widget (a placeholder block with the file name) per upload id, mapped through every transaction, so typing during a slow upload never shifts the insertion point; on success the widget is removed and the image inserted at its mapped position, on failure the widget is removed.
- Progress: RTK Query's `fetchBaseQuery` cannot report upload progress, so `uploadBlogImage` becomes a `queryFn` endpoint in the same API slice (the project rule "never a new fetch in a component" holds; the notifications listener and error shape keep working) that uses `XMLHttpRequest` to the same route with the same JSON body and the same `{status, message}` error mapping, and publishes `loaded/total` to a tiny client-only store `src/lib/blogUploadProgress.ts` keyed by a serializable `uploadId` (a function or File in the mutation argument would trip the Redux serializable check). `UploadStatus.tsx` renders the queue under the editor: file name, a `<progress>` per file, and an error line with Dismiss; the region is `aria-live="polite"`. The progress is bytes of the request body sent (base64, about 4/3 of the file), good enough for a bar.
- Rejected: a new multipart upload route (new surface, outside "no new route"), and per-file spinners only (the spec asks for visible progress).

### D6. Legacy Markdown conversion
`@tiptap/markdown` converts GFM tables and task lists when the table/task extensions are registered. `blogMarkdownImport.ts` therefore stops flattening tables and stripping task boxes, `scanLegacyMarkdown` no longer reports `tables` and `task lists`, and the notice in `BlogEditor.tsx` lists only what is still lost (raw HTML, remote images). The Builder verifies with a script that a Markdown post with a table and a task list converts to nodes that pass `validateDoc` (cells must come out as paragraphs); if the conversion cannot be made valid, that item stays flattened and in the notice (record it in the PR).

## Risks / Trade-offs

- **Contract drift**: `blogDoc.ts` and its mirror must stay identical; `check:blog` fails otherwise. It is extended with scenarios for each new value.
- **Clipboard HTML** (pasting a table or colored text from a web page): Tiptap parses it through our schema, so unknown attributes and colors are dropped (our marks only parse palette ids from `data-color`, never from `style`), and a non-palette color simply does not survive. Checked in Tester scenarios.
- **Bundle size**: the new extensions load only with the editor chunk (dynamic import), so `/`, `/about` and `/posts/*` are unaffected.
- **Per-post document size**: tables raise node counts; `MAX_DOC_NODES` (20 000) and the table caps bound it.
- **Browser support**: the XHR upload progress and `posAtCoords` are standard. Touch devices have no drag and drop; the picker and paste cover them.
- **Reader themes**: palette colors need contrast in light, dark and paper; checked per theme.

## Migration

None. Old posts do not contain the new attributes and validate and render unchanged (scenario "Post without tables"); a post saved with the new nodes is not readable by an older deployed reader, which is accepted because dev and prod receive the site and function together.

## Open questions for the PO (answers go into this file)

1. D3: confirm the alt-as-caption fallback for images without an explicit caption.
2. D1: confirm "plain text" cells mean one paragraph with inline text and marks, no nested blocks.
