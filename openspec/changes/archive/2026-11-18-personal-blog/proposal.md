## Why

The owner wants a personal blog on the site. Only the admin writes at first, but access must be widenable later to other users without code changes. Each author's posts must be stored privately so an author sees and changes only their own, with the admin able to edit anybody's. The public home page should tease the blog with a few random published headers.

Fixes #134.

## What Changes

- A blog editor at `/blog`: list my posts, create, edit, delete, draft or published. A post has a title, Markdown body, images and tags.
- A new permission `blog:write`. Which roles hold it comes from the blog config; at first only `admin`. Widening later is a config edit.
- Ownership rules enforced server-side: an author reads, edits and deletes only their own posts (another author's post is a 404); the admin can view, edit and delete any author's posts; no other role can.
- The public home page `/` shows a random sample of headers (title, date, excerpt, tags) of published posts from all authors. Drafts never appear. Nothing renders when there are none or the section is off.
- A new config file `blog-config.json` (edited in `/admin/cms`, example as fallback) turns the section on or off and holds its limits (home sample size, post size, image size and count, the roles that hold `blog:write`). Off means the blog routes answer 404 and the home block is hidden.
- Posts and images live in private storage with no direct client access; every read and write goes browser -> Next.js server -> private function.

## Capabilities

### New Capabilities

- `blog`: authoring, ownership, storage, home sample and config switch.

### Modified Capabilities

- `access-control`: the `blog:write` permission, its config-driven role list and the `/blog` routes.
- `landing-page`: the public home shows a random sample of published blog headers.

## Impact

- Code: `src/lib/access.ts` and `functions/src/policy.ts`, `src/data` (blog config, `configFiles.ts` mirrored in `functions/src/cms.ts`), `src/app/blog`, `src/app/api/blog`, `src/middleware`, `functions/src`, home sections, drawer config.
- Infrastructure (Architect to confirm with the owner before building): private storage for posts and images, rules, and any new Cloud Functions, all in Terraform.
- Docs: `CLAUDE.md`, `docs/DEPLOYMENT.md` if infrastructure changes, README structure section.
- New stored data and likely new cloud resources and cost: owner decisions raised by the Architect.

## Out of scope

Public per-post reading pages and comments, a rich-text editor, scheduled publishing, search, RSS, per-user allow lists, post versioning or undo, and any change to the existing roles other than adding the permission.

## Decisions taken with the owner (2026-11-18)

- Home headers are public, published posts only, from every author.
- Content is Markdown with images and tags.
- Write access is the permission `blog:write`, admin only for now, widenable through the config.
