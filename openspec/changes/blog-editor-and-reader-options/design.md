## Context

The editor (Tiptap v3, `src/components/blog/RichEditor.tsx`, `EditorToolbar.tsx`) stores a closed-schema JSON document validated by `src/lib/blogDoc.ts`, mirrored byte-for-byte in `functions/src/blogDoc.ts`. Rendering is `BlogContent.tsx` (React elements, no HTML parsing) used by `BlogView` (author) and `/posts/[id]` (public). Images go browser -> `POST /api/blog/[id]/images` -> `blogService.uploadBlogImage` -> `blog` function `imageUpload` -> bucket `<project>-blog`.

## Image upload: root cause (item 4, investigated first)

**Status: not reproduced against the live cloud function; the code path was reviewed end to end and no defect was found in the contract.** This container has no GCP credentials, so the real `blog` function and bucket cannot be called here. What was checked, with results:

- Contract: `validateDoc` accepts the `image` node the editor inserts (`{imageId, alt}`), run directly; `unwrapImage` matches the function's `{ image, images }` answer; the route, RTK endpoint and `readBase64` are consistent; `checkImage` limits match the example config (2 MiB).
- Bucket: `blog_storage` in `terraform/main.tf` mirrors the resumes bucket and names match `functions/src/firebase.ts`. Neither bucket has its own IAM binding (the function's runtime account uses project-level access), so there is **no evidence of an IAM or resource gap**.

Ranked hypotheses for the owner's failure, none needing a new cloud resource:

1. **Timeout and cold start.** `callCloudFunction` aborts after `TIMEOUT_MS = 10_000`. An upload sends up to ~2.8 MB of base64 through three hops, then a cold `blog` function writes to Storage and runs a Firestore transaction. An abort is not a `CloudFunctionError`, so the user sees only a generic "Request failed." with no cause.
2. **Upload is unavailable until the first save.** `canUpload` needs `postId`, so on a new post the toolbar image button and the Upload button are disabled; the only hint is a small line "Save the post once to add images." and the toolbar button gives none. This reads as "upload does not work".
3. **Opaque errors.** Network, abort and 5xx all collapse to generic messages (`failure()` returns "Request failed."), so a real cause is invisible.

**Decision:** Task 1 is a confirm-first task. A Builder runs the site locally (`npm run dev`) against a local stand-in for the `blog` function that serves the real `checkImage`/`imageUpload` contract, exercises new-post and saved-post uploads with png, jpeg, webp, gif, a 2 MiB file, an over-limit file and a wrong type, and records the observed failure in this section before any fix. The fixes below are applied only for causes the repro (or the owner's report on dev) confirms: (a) raise the upload call timeout to 30 s for `imageUpload` only (per-call option on `callCloudFunction`, default unchanged) and map an abort to a clear 504 message; (b) show why upload is unavailable (disabled-reason text, and the toolbar button's tooltip); (c) return specific messages for wrong type, over limit and unreachable server. **If the confirmed cause needs a new cloud resource, IAM or secret, the build stops and the Architect escalates to the PO for an owner decision.** If the cause proves independent of this change, the PO splits it into its own issue.

Option rejected: auto-creating a draft on first upload so a new post can take images. It writes stored data the proposal did not approve and creates posts the author did not ask for; revisit only if the owner asks.

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
