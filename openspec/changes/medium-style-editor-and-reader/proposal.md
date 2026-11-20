## Why

The owner wants the blog editor and the public post page to work and read like Medium's: a distraction-free writing canvas with a floating toolbar, a calm reading layout, and reader engagement. Today the editor has a fixed toolbar, the reader has no byline details, and readers cannot react, comment or save posts.

Fixes #143.

## What Changes

- **Editor:** a large title field, a serif body, a floating toolbar on text selection and a "+" insert menu on an empty line, replacing the fixed toolbar. All existing formats, limits and style whitelists stay.
- **Reader:** a narrow centered serif reading column with the author name, publish date and estimated read time, tags and image captions. The #141 theme and compact/stretch controls stay.
- **Engagement (signed-in users):** like a post, bookmark a post and see their bookmarks, comment on a post. Counts and comments are visible to everyone; acting needs sign-in. The post author and the admin can remove any comment on their post (admin: any post); a user can remove their own like, bookmark and comments.
- Only layout and interaction patterns are copied: no Medium name, logo, icons or assets.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `blog`: editor canvas and floating toolbar, reading layout, and reactions, bookmarks and comments.

## Impact

`src/components/blog/`, `src/app/posts/[id]/`, `src/app/api/blog/*`, `functions/src/blog*.ts`, `src/styles/`, `openspec/specs/blog/spec.md`, docs. Engagement stores new reader data in Firestore (the Architect decides the model); no new cloud resource, IAM or secret is expected. Security-relevant: reviewed by the owner at proposal approval.

## Assumptions to confirm at proposal review

- Any signed-in user may like, bookmark and comment (not only roles with `blog:write`).
- A like is a single toggle per user per post (not Medium's multi-clap).
- Comments are plain text, flat (no replies), limited in length through `blog-config.json`.
- A bookmarks list is available to the signed-in user (location decided by the Architect).

## Out of scope

Medium branding or copied assets; following authors, newsletters, paywall, publications, recommendations feed, notifications, search; replies and threads; comment editing.
