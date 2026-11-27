## Context

The blog editor is Tiptap v3 (`RichEditor.tsx`, `FloatingToolbar.tsx` for text selection, `InsertMenu.tsx` on an empty line). A post is stored as a closed JSON document validated by `src/lib/blogDoc.ts` (mirrored byte-for-byte in `functions/src/blogDoc.ts`, checked by `npm run check:blog`) and rendered to React elements by `BlogContent.tsx` through lookup tables; until now stored text never reached `class`, `style` or any attribute. Images are uploaded one at a time through `useUploadBlogImageMutation` -> `/api/blog/[id]/images` -> the private `blog` function (type by magic bytes, size and count limits enforced there, removal through `removeImageIds` on save). The same document is shown in three places that must agree: the editor, the author's read-only view and the public page (the last two both go through `BlogContent`).

Everything in the proposal fits the existing architecture. **No new cloud resource, function, secret, config key or API route is needed.** Dependencies added: Tiptap v3 extension packages only (pinned `3.34.0`); image editing is hand-written canvas code, no library. Stored-data change: new whitelisted attributes inside the same post document (no new collection, bucket or field); an image edit creates one more object in the existing blog bucket, within the existing per-post limits, and the replaced one is deleted on save.

## Goals / Non-Goals

**Goals:** everything in the spec; old posts render and edit exactly as before; the stored format stays a closed whitelist; the editor can be hosted by another surface without copying code.
**Non-goals:** the proposal's out-of-scope list; wrapping text around images (alignment places the block); migrating other surfaces; making the document schema itself host-pluggable (D7); editing images that are external URLs.

## Decisions

### D1. Stored schema additions (`blogDoc.ts`, mirrored)
All validated and rebuilt field by field like the existing ones; anything else is refused with a message naming the attribute and value.

- `table` > `tableRow` > `tableHeader` | `tableCell` > `paragraph` (exactly one paragraph, inline text and marks, no nested blocks). Tables are allowed where `BLOCKS` are allowed except inside a cell. Caps: `MAX_TABLE_ROWS` 100, `MAX_TABLE_COLS` 12.
- **Merged cells** (owner addition): a cell may carry `colspan` and `rowspan`, integers 1..`MAX_TABLE_COLS` and 1..`MAX_TABLE_ROWS`, stored only when greater than 1. `colwidth` is accepted only as null and dropped (no column resizing). The validator checks the whole grid, not only each cell: the width is the sum of the first row's colspans; row by row each cell is placed at the next free column (skipping columns covered by a rowspan from above), must fit the width and overlap nothing, a rowspan must not extend past the last row, and every row must end with all columns covered. A table that fails this is refused ("table cells do not add up"). Merge and split in the editor use Tiptap's `mergeCells`/`splitCell` (prosemirror-tables keeps the grid valid, so what it produces passes this check).
- `taskList` > `taskItem` (attr `checked` boolean; content one `paragraph`; no nested task lists).
- Marks: `highlight` and `textColor` (attr `color`), `subscript`, `superscript` (never both on one text).
- **Colors** (owner addition): a stored color is exactly `#rrggbb` (`HEX_COLOR = /^#[0-9a-fA-F]{6}$/`; rebuilt lowercase, so the stored value is canonical). The preset palette is **only a UI list of hex values** (`COLOR_PRESETS` in the editor), so storage has one shape and no palette-id lookup exists. Anything else, including 3-digit hex, `rgb()`, names, alpha, is refused with "color "<value>" is not allowed".
- `image` gains `size` (`IMAGE_SIZES = ['small','medium','full']`), `align` (`IMAGE_ALIGNS = ['left','center','right']`), `caption` (string up to 500 characters or null). The exactly-one-of `imageId`/`src` rule is unchanged.
- `docText` already recurses into cells and task items and now includes an image's caption, so the character counter counts visible text; `docExcerpt` may therefore show a caption (accepted).
- Defaults are never written: a node without new attributes is stored exactly as today, so old posts stay valid and unchanged.

### D2. Rendering, and the exception to "stored text never reaches class/style"
`BlogContent.tsx` renders tables (`<table>`, `<th scope="col">`, scroll wrapper; `colSpan`/`rowSpan` come from the validated integers, never from text), task items (disabled read-only checkbox with accessible label), `<sub>`/`<sup>`, and for image size and alignment looks up fixed class names in `Map`s built from the exported constants (`blog-img-size-<id>`, `blog-img-align-<id>`), exactly like `ALIGN_CLASS`.

For free colors the lookup-table approach cannot work (16.7 million values). **Decision:** the one explicit exception to the rule is a value that has passed `isHexColor` (the regex above, run again in the renderer; the validator already ran it on save). It reaches the page only as the value of a CSS custom property, set through React's `style` object (never string-concatenated markup): text color `style={{ '--blog-color': hex }}` with the fixed class `blog-color`; highlight `style={{ '--blog-hl': hex, '--blog-hl-ink': ink }}` with the fixed class `blog-hl`, where `ink` is `#000000` or `#ffffff` computed from the hex by a small pure function (`src/lib/blogColor.ts`, WCAG relative luminance) so the highlighted text stays readable in every reader theme. The rules (`color: var(--blog-color)`, `background-color: var(--blog-hl)`) live in `blog-content.css`; no other stored string is ever written into `style`, and a value failing the regex renders as plain text. When both marks are present the highlight is the outer element and the text color the inner one, in the reader (canonical order, independent of the order in the stored marks array) and in the editor (mark priority), so an explicit text color wins over the highlight's ink.
Rejected: (a) writing `color: <value>` straight into an inline style (the same safety after the regex, but no way to tune themes or ink and it normalises "style from stored text"); (b) snapping a free color to the nearest palette id (loses "exactly that color"); (c) one generated CSS class per used color (unbounded stylesheet, needs a build or runtime CSS injection).
Known trade-off: a free color gives the author no contrast guarantee against the dark and paper reader themes (only highlight ink is automatic). Accepted as the author's choice.

**Preset text colors (fix round 1, after the Tester measured the first presets below 4.5:1).** No single hex can reach 4.5:1 on white (needs relative luminance <= 0.18), on the dark theme (>= 0.21) and on paper (<= 0.15) at once, so "readable in all three" cannot be met by choosing better hexes. Decision: the stored value of a preset stays exactly its hex (`#rrggbb`, unchanged storage, `check:blog` unaffected), but the renderer and the editor recognise it through a lookup table (`src/lib/blogColorPresets.ts`, hex -> fixed class `blog-cp-<id>`) and draw it with a per-theme shade defined in `blog-content.css` as `--cp-<id>` custom properties (site light, site dark, and the reader's light, dark and paper wrappers). A preset therefore sets no inline style at all; a free color is untouched and shown exactly as chosen, with no guarantee. Measured contrast of every shade is >= 4.7:1 on white, on `#0f172a`, on the site's dark base (about `#0c0d0f`) and on paper `#f4ecd8` (generated by a lightness search from each preset's hue). The toolbar swatch shows the stored hex, so the drawn shade can differ slightly from the swatch in dark and paper. Rejected: lowering all presets to a mid-tone (still fails one theme), and adapting every color including free ones (breaks "exactly that color").

### D3. Image caption versus alt text (approved by the PO)
A non-empty `caption` is shown as the figcaption and `alt` stays only the description; `caption: ""` shows no caption; null or absent (every existing image) keeps today's behaviour (alt shown as caption). The image toolbar writes `caption: ""` the first time an author touches the image panel.

### D4. Editor UI placement (avoids overlapping bubble menus)
- Always-visible `EditorActionBar` above the content (`role="toolbar"`, arrow roving): undo and redo (disabled from `editor.can()`), and while the cursor is in a table the table controls: rows above/below, columns left/right, delete row, column, table, **merge cells** (enabled when a cell selection can merge) and **split cell** (enabled in a merged cell).
- `FloatingToolbar` (text selection) gains highlight and text color: a popover with the preset swatches (named, keyboard operable), a native `<input type="color">` for the free choice, and "Remove"; plus subscript and superscript.
- `InsertMenu` gains "Table" (3 x 3 with header row) and "Task list".
- `ImageToolbar`, a `BubbleMenu` while an image node is selected: size (3), alignment (3), alt input, caption input, and for uploaded images an "Edit image" button (D6). External URL images get no edit button (their pixels cannot be read into a canvas because of cross-origin rules, and they are not ours to re-upload).

### D5. Upload: drop, paste, multi-file, progress
- Sources: picker (`multiple`), `handleDrop` (position from `view.posAtCoords`) and `handlePaste` in `editorProps`, only for image files; text/html drops and pastes stay with Tiptap.
- `useImageUploads` owns a sequential queue (one file at a time so counts are checked in order; the server stays authoritative). Client pre-checks use the same limits (type by `file.type`, `maxImageBytes`, remaining count including queued files); a failure shows "<file name>: <reason>" and inserts nothing. A never-saved post is saved as a draft once before the first file through the host's `ensureSaved` (the form's existing path); the editor is not remounted so text and cursor survive.
- `uploadPlaceholder.ts`: a ProseMirror plugin holding one decoration widget per upload id, mapped through every transaction, so typing during an upload never moves the insertion point; success replaces the widget with the image, failure removes it.
- Progress: `fetchBaseQuery` cannot report upload progress, so `uploadBlogImage` becomes a `queryFn` endpoint in the same API slice (project rule: no new `fetch` in a component; the notification listener and `{status, message}` errors keep working) using `XMLHttpRequest` to the same route with the same body; it publishes `loaded/total` to a client-only store `src/lib/blogUploadProgress.ts` keyed by a serializable `uploadId` (a function or File in the argument would trip the serializable check). `UploadStatus` renders the queue under the editor (`<progress>` per file, error with Dismiss, `aria-live="polite"`). Progress is bytes of the request body sent (base64, about 4/3 of the file).
Rejected: a multipart upload route (new surface), spinner-only feedback (spec says progress).

### D6. Image editing (crop, rotate 90, flip H/V, reset) — client-side canvas
- Lives in a modal `ImageEditor` (native `<dialog>`, focus trap, Escape cancels) opened from the image toolbar for an uploaded image. It loads the image from the same-origin image URL (no canvas taint), shows a preview and holds the operations as state: quarter turns (left/right), flip horizontal, flip vertical, and a crop rectangle. The crop box is hand-written (pointer drag with 8 handles, plus arrow keys to move and Shift+arrows to resize, so it is keyboard operable); no library.
- **Apply** renders the result on a canvas from the *current* image (so edits compose) and encodes it as the original's type (`image/png`, `image/jpeg` at quality 0.92, `image/webp`); animated GIF is not editable (the edit control is disabled with the reason "unsupported image"), and a result over 8000 px on a side or that fails to encode is an error. The blob is uploaded through the same `uploadBlogImage` path and limits as any image (type, `maxImageBytes`, count), then the node's `imageId` is swapped in place (size, align, alt, caption kept). Any failure shows a message naming the reason and leaves the node and the post unchanged.
- **Reset** and the original: the shared editor keeps a client-only map `editedFrom: newImageId -> rootImageId` (the first image of a chain; a second edit of an edited image keeps the same root). Reset swaps the node back to the root id with no upload. Nothing is deleted when an edit is applied: the host receives `onImageReplaced(oldId)` and, **on save only**, adds every replaced id that the saved document no longer references to `removeImageIds` (the existing deletion path), so Reset works until the post is saved and Ctrl+Z (which re-references the original) is safe. After a save the map is cleared.
- Cost of that: between an edit and the save an edited image takes one extra slot of the per-post image count; at the limit the edit fails with the existing limit message ("remove an image or save first"). No server change.
Rejected: server-side image processing (new function or dependency, cost); a crop library (dependency and styling cost for one tool); replacing the original object immediately (loses Reset).

### D7. Reusable editor
The editor moves from `src/components/blog/` to `src/components/editor/` (`RichEditor`, `FloatingToolbar`, `InsertMenu`, `EditorActionBar`, `ImageToolbar`, `ImageEditor`, `UploadStatus`, `useImageUploads`, the extension files, `uploadPlaceholder`) with no import from `components/blog`, `store/api` or blog types. A host passes a small contract:
```
interface RichEditorHost {
  initial: EditorInitial
  label: string                                   // aria-label of the textbox
  images: {
    imageUrl(id: string): string                  // displays and edits stored images
    upload(file: { name: string; dataBase64: string; uploadId: string }): Promise<{ id: string; name: string }>
    limits: { maxBytes: number; remaining(): number; maxUrlLength: number }
    ensureSaved?(): Promise<boolean>              // false stops the upload (never-saved document)
    onReplaced?(oldId: string): void              // an edit replaced an image (host removes it on save)
    legacyScheme?: string                         // markdown image scheme to import, e.g. blog-image:
  }
  onDoc(doc: JSONContent): void
  onError(message: string): void
}
```
`BlogEditor.tsx` becomes the blog host: it implements the contract with the RTK endpoint, the blog limits and `ensureSaved`, and keeps title, tags, counters, save, delete, publish and conflict handling. Editor styles that are not blog-specific move to a new `src/styles/components/rich-editor.css`, imported in `src/index.css` right after `blog-editor.css`. The document format is shared: the editor imports its whitelists from `src/lib/blogDoc.ts`, so a host with the same format reuses it as is. Making the schema pluggable per host (and renaming or moving `blogDoc.ts`, which the function mirror and `check:blog` pin) is deliberately not done now; the PO should know that a host needing a different format will need a follow-up change. A neutral name for the module can be added when the first second host appears.
Rejected: publishing the editor as a separate package (build and release overhead for one repo); leaving it in `components/blog` and only documenting it (the spec asks for no copy of its code).

### D8. Dependencies and legacy Markdown
New packages (3.34.0, both lockfiles): `@tiptap/extension-table`, `@tiptap/extension-list` (TaskList, TaskItem), `@tiptap/extension-subscript`, `@tiptap/extension-superscript`. The color and highlight marks are in-repo (they store `#rrggbb` only, parsed from `data-color`, never from `style`). `@tiptap/markdown` converts GFM tables and task lists once the extensions are registered, so `blogMarkdownImport.ts` stops flattening tables and removing task boxes, `scanLegacyMarkdown` stops reporting them, and the notice lists only raw HTML and remote images. The Builder proves with a script that a Markdown post with a table and a task list converts to a `validateDoc`-valid document (cells must be paragraphs); if it cannot be made valid that item stays flattened and in the notice (recorded in the PR).

## Risks / Trade-offs

- **Contract drift** between `blogDoc.ts` and its mirror: `check:blog` fails when they differ and is extended with every new value, including a grid-validation matrix.
- **Table grid validity**: hand-edited or API-submitted merges could overlap; the whole-grid check (D1) refuses them, and the reader renders only validated documents.
- **Clipboard HTML** (a table or colored text pasted from a web page): parsed through our schema, so unknown attributes are dropped, colors are read only from our `data-color` marker (a pasted inline `style` color is ignored), and spans pass the same bounds.
- **Image edit at the count limit** and temporarily extra storage (D6); deleted on save.
- **Canvas limits**: very large images or browsers without canvas encoding for a type give a clear error and no change.
- **Bundle size**: everything loads with the editor chunk (dynamic import); `/`, `/about`, `/posts/*` unaffected.
- **Refactor risk** (D7): a behaviour-preserving move done first, before the new features, so a regression is easy to see; all existing blog scenarios and `check:blog` must still pass at that point.

## Migration

None. Old posts lack the new attributes and validate and render unchanged; a post saved with new nodes is not readable by an older deployed reader, accepted because dev and prod receive site and function together.

## Open questions

None open. Answered by the PO: caption rule (D3) approved; plain-text cells one paragraph with inline marks, merged cells in scope (D1).
