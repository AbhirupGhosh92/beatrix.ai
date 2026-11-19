## Why

The owner tried the rich-text editor and public reading page shipped in #137 and reported four problems: no text alignment, no way to style bullets and numbered lists, no reader options (theme, compact or stretched width), and the image upload does not work (its button cannot be clicked on a new post). The owner then chose to replace upload with Medium-style inline images by URL. Together they keep the blog from feeling finished to write in and to read.

Fixes #141.

## What Changes

- **Alignment.** The editor offers left, center, right and justify for paragraphs and headings. The choice is stored with the post and shown the same way in the editor, the author's read-only view and the public post page.
- **List styling.** Bulleted lists can use a disc, circle or square marker; numbered lists can use decimal, alpha or roman numbering. The choice is stored with the post and shown in the reader.
- **Reader options.** The reading views get a theme choice (light, dark, and a sepia "paper" theme; default follows the site theme) and a compact or stretched width toggle. Both are remembered per browser, are reader-side only and never change the post.
- **Inline images, by upload or URL.** An author places an image between paragraphs, as on Medium, either by uploading a file (existing private storage, type and size limits unchanged) or by giving an https image URL with alt text. The image shows at that position in the editor, the author view and the public page. Only absolute https URLs are accepted, within a length limit from the blog config.
- **Upload on a new post.** The image control is always usable. On a post that was never saved it first saves a draft (a title is required; otherwise the author is told what is missing) and then opens the file picker. This replaces the dead icon the owner reported.
- Only a fixed list of alignment and list-style values is accepted on save and rendered, so post content still cannot carry scripts or arbitrary styles. Posts written before this change, and legacy Markdown posts, open and render as before.

## Capabilities

### Modified Capabilities

- `blog`: alignment, list styling, reader display options, inline images (upload or https URL), upload on a new post, and the whitelist of stored style values.

## Impact

- Code: `src/components/blog/` (editor toolbar, rich editor, read-only view, content renderer, preview), `src/lib/blogDoc.ts` mirrored in `functions/src/blogDoc.ts`, the blog image URL handling, the `blog` function, blog config (new image URL length limit), `src/styles/`, `package.json`.
- Stored data: the post document format gains optional style attributes and an image node with an https `src`. Existing posts stay valid without them. A draft may now be created automatically on the first upload of a new post (owner decision).
- Security: post content may now load remote images (https only). The owner decided any https image is allowed (no host allowlist); the validator, renderer and a `Content-Security-Policy` `img-src` check, if the site sets one, must agree. The reader's browser contacts the image host.
- No new cloud resources, cost, IAM or secrets; the existing private image bucket and upload path are kept.
- Docs: `CLAUDE.md` (Personal blog section), README structure section if files are added.

## Out of scope

Image captions, resizing, remote images in legacy Markdown posts, per-post themes chosen by the author, fonts and font sizes, text color and highlight, tables, comments, and new cloud resources.

## Decisions taken with the owner

- Reader theme options are at least light, dark and a sepia/paper theme, defaulting to the site theme (from the issue).
- Keep file upload and also allow https image URLs, placed inline between paragraphs; any https host is allowed (owner, 2026-11-19).
- The first upload on a new post auto-saves a draft (owner, 2026-11-19).
