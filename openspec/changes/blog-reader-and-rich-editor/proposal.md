## Why

The owner validated the blog from #134 and wants it to be a real reading and writing experience: visitors should see who wrote a post and be able to read it, authors should write in a full rich-text editor instead of raw Markdown, and every text limit should be understandable in characters.

Fixes #137.

## What Changes

- The home page headers show the author's display name (never the email address).
- Clicking a header opens a public, read-only page for that published post (title, author, date, tags, formatted body, images). Drafts, deleted and unknown posts are not found. In an author's `/blog` list a post can also be opened read-only; editing is a separate action.
- The editor becomes a rich-text (WYSIWYG) editor in the style of Medium: toolbar and keyboard shortcuts for headings, bold, italic, underline, strikethrough, bulleted and numbered lists, block quote, inline code and code blocks, links, horizontal rule, images and undo/redo, with the formatting visible while typing. Posts written before this change still open and read correctly.
- Every text limit (title, body, tags, excerpt) is set, enforced and shown in characters, with a live "n / max characters" counter in the editor. The image limit stays in bytes (shown as MB/KB) because it is not text. An existing `blog-config.json` with the old byte key keeps working.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blog`: author on headers, public read-only post page, rich-text editing, character limits.
- `landing-page`: home headers show the author and open the post.
- `access-control`: published posts are readable without a session.

## Impact

- Code: `src/components/blog/`, `src/components/sections/LandingBlog.tsx`, new public post route (page and API), `src/lib/access.ts` public paths, blog config (`src/data/blogConfig.ts`, example, sanitizer), `functions/src/blog*.ts`, specs, docs.
- Infrastructure: none expected; the Architect must flag any new cloud resource or function to the owner before building.
- New public data: published post bodies, images and the author display name become readable without a session. Security-sensitive; the Architect designs it so drafts, emails and other authors' private data never leak.

## Out of scope

Comments, search, RSS, scheduled publishing, author profiles or avatars, SEO or social-sharing metadata beyond a page title, collaborative editing, changing who may write (unchanged `blog:write`).

## Open items for the owner at the proposal gate

- Where the author display name comes from (the sign-in account's name, or a name the admin sets); the Architect proposes.
- Public reading of published posts and their images is new exposure and is part of this request.
