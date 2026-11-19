## Context

The editor (Tiptap v3, `src/components/blog/RichEditor.tsx`, `EditorToolbar.tsx`) stores a closed-schema JSON document validated by `src/lib/blogDoc.ts`, mirrored byte-for-byte in `functions/src/blogDoc.ts`. Rendering is `BlogContent.tsx` (React elements, no HTML parsing) used by `BlogView` (author) and `/posts/[id]` (public). Images go browser -> `POST /api/blog/[id]/images` -> `blogService.uploadBlogImage` -> `blog` function `imageUpload` -> bucket `<project>-blog`.

## Image upload: root cause (item 4, short) and scope change

The owner's report was that the toolbar "Insert image" button could not be clicked. Confirmed in code: `canUpload = !!postId && ...` disables it on a new unsaved post (a post needs an id before `imageUpload`), so no request was sent. The frozen `imagePostId` in `RichEditor.tsx` was not a defect (saving a new post remounts the form under its id); the bucket mirrors the resumes bucket and no IAM gap was found. **Owner decision 2026-11-19: file upload is removed and replaced by inline images by https URL**, so this cause no longer needs a fix: the upload UI, routes and function actions go away.

## Inline images by URL

- **Node.** The `image` block node becomes `{ type: "image", attrs: { src, alt } }`; `src` is required. Block between paragraphs, no inline images, no `title`, `width`, `height` or other attrs.
- **URL rule** (one function `isHttpsImageUrl(value)` in `blogDoc.ts`, used by the validator, the editor and the renderer): a string with no whitespace or control characters that `new URL()` parses to protocol `https:`, with a host, and with no username or password. `http`, `javascript:`, `data:`, `blob:`, protocol-relative and relative values fail. Any https host is allowed (owner). Rejected: a host allowlist (owner said any host) and rewriting through a proxy route (would be a new server surface and cost).
- **Length limit.** New blog config key `maxImageUrlLength` (characters, default 2000, bounds 20 to 8000), enforced by `validateDoc(raw, limits?: { maxImageUrlLength?: number })` on the server (function passes `config`) and in the browser (editor passes the config value); the refusal says the limit in characters. `maxImageBytes` and `maxImagesPerPost` are removed from types, sanitizer, example, public config and the function limits; a stored config that still has them loads and they are ignored (no warning noise). A post is still bounded by the existing body length limit; alt text keeps its 500 character limit.
- **Renderer.** `BlogContent` renders `<img>` only when `isHttpsImageUrl(src)`; the only attributes are `src`, `alt`, `loading="lazy"`, `decoding="async"` and `referrerPolicy="no-referrer"` (the host never learns the post URL). Nothing else from stored text reaches the element. A broken URL shows the alt text natively and never breaks the post. The `imageUrl` prop is removed.
- **Editor.** The toolbar "Insert image" opens a small inline form (https URL, alt text, Insert, Cancel) like the existing link prompt; invalid input is refused with the same message as the server. The editor's image extension keeps only `src` and `alt`, parses only `img[src^="https://"]`, has `allowBase64: false`, and its Markdown input rule accepts https only. The Images panel and Upload button are removed. The editor shows the image at its position with `no-referrer`.
- **Earlier uploaded images.** Stored nodes of the form `{ imageId, alt }` (no `src`) are legacy. `validateDoc` silently drops them (so an old post still saves), and `stripLegacyImages(doc)` (exported, same file) is applied by the editor before loading and by the renderer, so they are neither shown nor requested and the text is unchanged. The stored `images` array on the Firestore document is left untouched and no longer returned. Legacy Markdown `blog-image:` references are dropped by the Markdown renderer, as any non-https image already is.
- **Removed code.** `/api/blog/[id]/images` (and `[imageId]`), `/api/posts/[id]/images/[imageId]`, `uploadBlogImage`/`getBlogImage` in `blogService.ts`, the RTK `uploadBlogImage` endpoint, `imageUpload`/`imageGet`/`publicImageGet` in the `blog` function, `checkImage` and `detectImageType`, `BlogImage`/`images`/`imageCount`/`removeImageIds` in types and responses (a save request still carrying `removeImageIds` is ignored). `isPublicPostPath` keeps only the post page pattern.
- **Removed routes answer 404 for everyone.** Without a rule, an anonymous request to a removed API path would get the proxy's 401. `access.ts` exports `isRemovedImageRoute(pathname)` (the two former image route shapes) and `src/proxy.ts` answers 404 for it before the session check, so the spec's "answered not found" holds with or without a session.
- **Kept on purpose.** The blog function's `delete` still removes `<postId>/` objects of the deleted post (existing behavior; versioned bucket, 30-day retention). No object is otherwise deleted, the bucket and Terraform are untouched (owner: data cleanup later by hand).
- **CSP.** Checked `next.config.ts`, `src/app/layout.tsx`, `apphosting.yaml`, `firebase.json` and `src/proxy.ts`: the site sets no `Content-Security-Policy`, no `img-src` and no `images.remotePatterns` (plain `<img>`, not `next/image`), so remote https images load with no config change. If a CSP is added later, `img-src` must allow `https:`; documented in CLAUDE.md.
- **Legacy Markdown remote images (owner question 5).** A cheap and safe way exists (an https-only `img` mapper in `BlogPreview`), but it would change how existing legacy posts render and the spec says they render as before. Recommendation: leave legacy Markdown without remote images; legacy posts that are edited are converted to the rich editor, where the author can add the images by URL.

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
- Security: remote https images let a third-party host see the reader's IP and request time. Mitigated by `no-referrer`, the strict URL rule and https only; accepted by the owner.
- Tiptap attribute round trip: unknown attrs are dropped by `checkAttrs`, so every new attr must be added to both the editor schema and the validator (covered by a script check in Task 2).
- Paper theme colors are a design choice within the existing design language; tokens, no raw hex outside `blog-content.css`.
