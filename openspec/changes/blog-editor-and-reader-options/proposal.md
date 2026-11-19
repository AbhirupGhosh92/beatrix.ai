## Why

The owner tried the rich-text editor and public reading page shipped in #137 and reported four problems: no text alignment, no way to style bullets and numbered lists, no reader options (theme, compact or stretched width), and the image upload does not work (its button cannot be clicked on a new post). The owner then chose to replace upload with Medium-style inline images by URL. Together they keep the blog from feeling finished to write in and to read.

Fixes #141.

## What Changes

- **Alignment.** The editor offers left, center, right and justify for paragraphs and headings. The choice is stored with the post and shown the same way in the editor, the author's read-only view and the public post page.
- **List styling.** Bulleted lists can use a disc, circle or square marker; numbered lists can use decimal, alpha or roman numbering. The choice is stored with the post and shown in the reader.
- **Reader options.** The reading views get a theme choice (light, dark, and a sepia "paper" theme; default follows the site theme) and a compact or stretched width toggle. Both are remembered per browser, are reader-side only and never change the post.
- **Inline images by URL (replaces image upload).** The editor's file upload is removed. An author places an image between paragraphs by giving its https URL (and alt text), as on Medium; it shows at that position in the editor, the author view and the public page. Only absolute https URLs are accepted. The image route, the upload function actions and the image size and count limits go away; posts that held uploaded images still open, with those images no longer shown. Deleting the stored image files is a separate manual step after the owner has checked (the bucket keeps 30-day versions), not part of this change.
- Only a fixed list of alignment and list-style values is accepted on save and rendered, so post content still cannot carry scripts or arbitrary styles. Posts written before this change, and legacy Markdown posts, open and render as before.

## Capabilities

### Modified Capabilities

- `blog`: alignment, list styling, reader display options, inline images by URL (replacing upload and the image limits), earlier uploaded images, and the whitelist of stored style values.
- `access-control`: the public blog image route is removed.

## Impact

- Code: `src/components/blog/` (editor toolbar, rich editor, read-only view, content renderer, preview), `src/lib/blogDoc.ts` mirrored in `functions/src/blogDoc.ts`, the blog image route, `blog` function image actions and blog config limits, `src/styles/`, `package.json`.
- Stored data: the post document format gains optional style attributes. Existing posts stay valid without them.
- Security: post content may now load remote images (https only). The owner decided any https image is allowed (no host allowlist); the validator, renderer and a `Content-Security-Policy` `img-src` check, if the site sets one, must agree. The reader's browser contacts the image host.
- No new cloud resources, cost, IAM or secrets. Removing the upload leaves the private `<project>-blog` image bucket in place, unused, until the owner decides to clean it.
- Docs: `CLAUDE.md` (Personal blog section), README structure section if files are added.

## Out of scope

Uploading or storing image files, image captions, resizing, deleting the stored image files and the blog image bucket, per-post themes chosen by the author, fonts and font sizes, text color and highlight, tables, comments, and new cloud resources.

## Decisions taken with the owner

- Reader theme options are at least light, dark and a sepia/paper theme, defaulting to the site theme (from the issue).
- Image upload is removed; images are placed by https URL; any https image host is allowed (owner, 2026-11-19).
- Uploaded images of existing posts stop being shown; the stored files are cleaned up later by hand, not in this change (owner, 2026-11-19).
