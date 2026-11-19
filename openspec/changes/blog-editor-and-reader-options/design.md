## Context

The editor (Tiptap v3, `src/components/blog/RichEditor.tsx`, `EditorToolbar.tsx`) stores a closed-schema JSON document validated by `src/lib/blogDoc.ts`, mirrored byte-for-byte in `functions/src/blogDoc.ts`. Rendering is `BlogContent.tsx` (React elements, no HTML parsing) used by `BlogView` (author) and `/posts/[id]` (public). Images go browser -> `POST /api/blog/[id]/images` -> `blogService.uploadBlogImage` -> `blog` function `imageUpload` -> bucket `<project>-blog`.

## Image upload: root cause (item 4, investigated first)

**Confirmed cause (owner report plus code): the editor's "Insert image" toolbar button is not clickable on a new, unsaved post.** `BlogEditor.tsx` computes `canUpload = !!postId && visibleImages.length < maxImagesPerPost`, and `EditorToolbar.tsx` passes `!canUpload || uploading` as the button's `disabled`. A post has no id until its first save, because images are stored as `<postId>/<imageId>` and `imageUpload` needs an existing post, so on a new post the button is disabled. The only hint is a small line under the editor ("Save the post once to add images."), and the toolbar button itself explains nothing. It is a UI gate, not a request failure: no request is sent.

Checked and ruled out by code review (the real cloud function could not be called from this container):
- Contract: `validateDoc` accepts the image node the editor inserts (run directly); `unwrapImage` matches the function's `{ image, images }` answer; route, RTK endpoint and `readBase64` are consistent; `checkImage` limits match the example config.
- The frozen `imagePostId = useState(postId)` in `RichEditor.tsx` is not a defect: saving a new post calls `onOpen(id)`, `BlogPage`/`BlogEditor` key the form by post id, so the editor remounts with the saved id and the image `src` is set. It would matter only if the editor stayed mounted across the first save, which it does not. Task 1.1 keeps a regression check for this.
- Bucket: `blog_storage` mirrors the resumes bucket; there is no evidence of an IAM or resource gap. No new cloud resource, IAM or secret is needed.

Secondary, not confirmed and fixed only if the repro shows them: `callCloudFunction` aborts after 10 s (large upload through a cold function) and failures collapse to a generic "Request failed.".

**Decision (least invasive, no stored data written):** the button stays clickable on an unsaved post and acts as an explanation: while no post id exists (or the image limit is reached) it keeps `aria-disabled`, shows a title/tooltip with the reason, and on click raises the existing error snackbar ("Save the post once to add images." / "A post holds at most N images."). The inline hint under the editor stays. After the first save the same button opens the file picker as today. Applies to both the toolbar button and the Upload button in the Images panel.

Options rejected: (a) auto-saving a draft on the first image click: it creates a post the author did not ask to save and writes stored data the proposal did not approve; it also needs a valid title and body to pass save checks, so it can fail anyway; available only if the owner asks. (b) Holding a chosen file in memory and uploading after the first save: needs a placeholder image node the validator rejects and extra state, for little gain.

## Decisions

### Alignment
- New dependency `@tiptap/extension-text-align` (npm package only; no cloud cost). Configured for `heading` and `paragraph`, values `left|center|right|justify`, default `left`.
- Stored as node attr `textAlign` on `paragraph` and `heading`. `validateDoc` allows the attr only on those two nodes and only with the four values; `left` is accepted. A missing attr means unchanged rendering. Rejected: inline `style`, any free text.
- Keyboard: the extension's defaults (Mod-Shift-L/E/R/J).

### List styling
- Custom attr `listStyle` on `bulletList` (`disc|circle|square`) and `orderedList` (`decimal|lower-alpha|upper-alpha|lower-roman|upper-roman`), added by extending the StarterKit list nodes in `RichEditor.tsx`; toolbar control is a small select shown while the selection is in a list. Missing attr = browser default as before.

### Whitelist and rendering
- The accepted values live in one exported constant in `blogDoc.ts` (`ALIGN_VALUES`, `BULLET_STYLES`, `ORDERED_STYLES`) used by the validator, the editor, the renderer and the toolbar.
- The renderer and editor map a value to a fixed CSS class through a lookup table (`blog-align-center`, `blog-list-square`, ...); the stored string is never written into `style`, `class` or any attribute. An unknown stored value hits no table entry and renders as default (spec: must not affect rendering).
- A refused save returns `The post content is not valid (<attribute> "<value>" is not allowed).` with the value truncated to 20 characters and control characters removed. This surfaces through the existing save error snackbar.
- Styles in a new `src/styles/components/blog-content.css`, imported in `src/index.css`.

### Reader options
- `src/lib/readerPrefs.ts`: a tiny client store (`useSyncExternalStore`, server snapshot = defaults) with keys `blog-reader-theme` (`auto|light|dark|paper`, default `auto`) and `blog-reader-width` (`compact|wide`, default `compact`). Reads and writes in try/catch; if storage fails the value is kept in memory, so the controls work for the visit and across posts in it. Not Redux (same reason as the site theme: purely local view state).
- `components/blog/ReaderFrame.tsx` wraps the article and sets `data-reader-theme` and `data-reader-width` on that wrapper only; `ReaderControls.tsx` holds the theme select and the width toggle. `auto` sets no attribute, so the site theme applies. Scoped CSS variables for light/dark/paper live in `blog-content.css` under `.reader[data-reader-theme=...]`; nothing global changes. Used by `/posts/[id]` and `BlogView`, not by the editor or the home block. The post page stays a server component; only the frame is client.
- Contrast: all three themes meet 4.5:1 for body text (checked in the Tester pass).

## Risks
- Mirrored `blogDoc.ts` must stay identical (`npm run check:blog`).
- Tiptap attribute round trip: unknown attrs are dropped by `checkAttrs`, so every new attr must be added to both the editor schema and the validator (covered by a script check in Task 2).
- Paper theme colors are a design choice within the existing design language; tokens, no raw hex outside `blog-content.css`.
