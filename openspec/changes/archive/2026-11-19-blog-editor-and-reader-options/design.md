## Context

The editor (Tiptap v3, `src/components/blog/RichEditor.tsx`, `EditorToolbar.tsx`) stores a closed-schema JSON document validated by `src/lib/blogDoc.ts`, mirrored byte-for-byte in `functions/src/blogDoc.ts`. Rendering is `BlogContent.tsx` (React elements, no HTML parsing) used by `BlogView` (author) and `/posts/[id]` (public). Images go browser -> `POST /api/blog/[id]/images` -> `blogService.uploadBlogImage` -> `blog` function `imageUpload` -> bucket `<project>-blog`.

## Image upload: root cause (item 4) and image decisions

**Root cause (confirmed in code and by the owner's report):** the toolbar "Insert image" button is disabled on a new unsaved post. `canUpload = !!postId && ...` feeds `disabled`; a post needs an id before `imageUpload` (images are stored under `<postId>/`), so no request is ever sent. The frozen `imagePostId = useState(postId)` in `RichEditor.tsx` is not itself a defect today (see "Post id switch" below) but must change with the fix. The upload path (contract, validator, bucket) was reviewed and has no defect. Owner decisions 2026-11-19: **keep upload unchanged, add https URL images, and make the control always usable by saving a draft first.**

### Image node: two sources
- The `image` block node is either an uploaded image `{ imageId, alt }` (as today) or an external image `{ src, alt }`: **exactly one of `imageId` and `src` per node**, otherwise `The post content is not valid (image).`. No other attrs. Posts, uploads, routes, bucket, limits and old posts stay as they are.
- URL rule: one shared function `isHttpsImageUrl(value)` in `blogDoc.ts` (used by validator, editor and renderer): no whitespace or control characters, `new URL()` parses to protocol `https:` with a host and no username or password. `http`, `javascript:`, `data:`, `blob:`, relative and protocol-relative values fail. Any https host is allowed (owner). Rejected: a host allowlist and a proxy route.
- Length: blog config key `maxImageUrlLength` (characters, default 2000, bounds 20 to 8000), added to the type, example, sanitizer, public config route and the function limits. `validateDoc(raw, limits?: { maxImageUrlLength?: number })` enforces it with a message stating the limit; the function passes `config`, the editor passes the config value.
- Renderer: an uploaded node renders through the existing `imageUrl(imageId)`; a URL node renders only when `isHttpsImageUrl(src)`. The `<img>` gets only `src`, `alt`, `loading="lazy"`, `decoding="async"` and, for URL images, `referrerPolicy="no-referrer"` (the host never learns the post URL). A broken URL shows its alt text natively and never affects the rest of the post. Legacy Markdown keeps rendering as before: no remote images (a cheap https-only mapper exists but would change old posts, and the owner chose to leave it).
- Editor: the toolbar image control offers two choices: Upload (file picker, as today) and By URL (a small inline form: https URL, alt text, Insert, Cancel; invalid input refused with the server's message). The image extension keeps `imageId`, `src` and `alt`, parses `img[data-image-id]` and `img[src^="https://"]` only, `allowBase64: false`, and its Markdown input rule accepts https only. The Images panel and its Upload button keep working and share the same gate.
- CSP: the site sets none (checked `next.config.ts`, `layout.tsx`, `apphosting.yaml`, `firebase.json`, `proxy.ts`; no `img-src`, no `images.remotePatterns`, plain `<img>`), so https images load with no config change. If a CSP is added later, `img-src` must allow `https:`; noted in CLAUDE.md.

### Always-usable image control (new post)
- The control is never disabled for "no post id" (only while an upload or save is running, or at the image-count limit, where a click shows the reason). Clicking Upload on a never-saved post: (1) run the form's existing checks (`problems`, valid document); if any fail, show the first reasons as an error snackbar and stop (no save, no picker); (2) save with `status: "draft"` (the draft toggle is set back to draft, since the spec says a draft is saved); (3) on success open the file picker; on a save error the existing error snackbar shows the reason and nothing opens. "By URL" needs no post id and works on an unsaved post without saving.
- **Picker after an awaited save.** Browsers may ignore `input.click()` once the user gesture has expired during the network call. After the save the code calls `input.showPicker()` inside try/catch; if it throws (no activation, as on some Safari versions) it shows "Draft saved. Choose the image again." and the next click opens the picker directly. The draft is never lost.
- Rejected: explain-only (button stays inert with a reason). Replaced by the owner's decision to save a draft first. Also rejected: holding the file in memory until the author saves (placeholder node state and a second path for little gain).

### Post id switch (keep cursor and typed content)
Today the first save calls `onOpen(id)`: `BlogPage` keys `BlogEditor` by the editing id and `BlogEditor` keys the form by the post id behind a skeleton while the post is refetched, so the whole editor remounts and the cursor, selection and any unsaved typing since the click are lost. The fix keeps the form mounted:
- `BlogPage` keeps the editor key stable when the id comes from the editor's own first save: it uses an `editorKey` that changes only when the author opens a different post or "new", not when `onOpen` reports the created id.
- `BlogEditor` holds `created` (the saved post) and, while `id` equals `created.id`, renders the same `BlogForm` element (same key) and skips the refetch skeleton, so the Tiptap editor instance, its selection and the form state (title, tags, doc) are untouched. `BlogForm` already holds `postId` and `version` in its own state after the save.
- `RichEditor` stops freezing the id: the image extension takes `getPostId: () => string | null` backed by a ref to the current `postId` (new images read it at insert time), replacing `useState(postId)`.
- Reload (409) and re-opening still use the fetched-post path with a fresh key. Verified by hand: type text, place the cursor mid-document, click Upload on a new post, choose a file; the image lands at the cursor and nothing typed is lost.

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
- Security: URL images let a third-party host see the reader's IP and request time. Mitigated by `no-referrer`, the strict URL rule and https only; accepted by the owner.
- The first-save draft is a stored-data write approved by the owner (2026-11-19).
- Tiptap attribute round trip: unknown attrs are dropped by `checkAttrs`, so every new attr must be added to both the editor schema and the validator (covered by a script check in Task 2).
- Paper theme colors are a design choice within the existing design language; tokens, no raw hex outside `blog-content.css`.
