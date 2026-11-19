## Why

The owner tried the rich-text editor and public reading page shipped in #137 and reported four problems: no text alignment, no way to style bullets and numbered lists, no reader options (theme, compact or stretched width), and image upload from the editor does not work. Together they keep the blog from feeling finished to write in and to read.

Fixes #141.

## What Changes

- **Alignment.** The editor offers left, center, right and justify for paragraphs and headings. The choice is stored with the post and shown the same way in the editor, the author's read-only view and the public post page.
- **List styling.** Bulleted lists can use a disc, circle or square marker; numbered lists can use decimal, alpha or roman numbering. The choice is stored with the post and shown in the reader.
- **Reader options.** The reading views get a theme choice (light, dark, and a sepia "paper" theme; default follows the site theme) and a compact or stretched width toggle. Both are remembered per browser, are reader-side only and never change the post.
- **Image upload fix.** Uploading an image from the editor works end to end for allowed types and sizes; failures show a clear message. The root cause is not yet known: it is reproduced and recorded first (item 4 is split into its own issue if it proves independent).
- Only a fixed list of alignment and list-style values is accepted on save and rendered, so post content still cannot carry scripts or arbitrary styles. Posts written before this change, and legacy Markdown posts, open and render as before.

## Capabilities

### Modified Capabilities

- `blog`: alignment, list styling, reader display options, the image upload requirement and the whitelist of stored style values.

## Impact

- Code: `src/components/blog/` (editor toolbar, rich editor, read-only view, content renderer, preview), `src/lib/blogDoc.ts` mirrored in `functions/src/blogDoc.ts`, the blog image route and function, `src/styles/`, `package.json`.
- Stored data: the post document format gains optional style attributes. Existing posts stay valid without them.
- No new cloud resources, cost, IAM or secrets are expected. If the image upload cause turns out to need any, that is an owner decision (escalate, do not build).
- Docs: `CLAUDE.md` (Personal blog section), README structure section if files are added.

## Out of scope

Per-post themes chosen by the author, fonts and font sizes, text color and highlight, tables, comments, and new cloud resources.

## Decisions taken with the owner

- Reader theme options are at least light, dark and a sepia/paper theme, defaulting to the site theme (from the issue).
- The image upload failure is tracked in this change, not as a separate issue, unless its cause is independent (from the issue).
