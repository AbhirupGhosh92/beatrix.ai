# Proposal

Fixes #124

## Why

The bio page is the only public page and doubles as the front door. The owner wants to share the bio as a resume link while making the default entry point a sign-in landing page, with its own editable configuration.

## What Changes

- `/` becomes a landing page for everyone. Anonymous visitors see the configured landing content and the Google sign-in button; a signed-in user sees the same page with a signed-in state and a way to open the drawer or go to About.
- The bio page (today's `/`) moves to `/about`, which is public. Nothing links to it for anonymous visitors; anyone with the URL can open it. It carries a visible link back to `/`.
- The sidebar and hamburger stay hidden for anonymous visitors on every page. Signed-in users get an "About me" entry in the drawer, configured like the other entries.
- Release notes show on `/` and no longer on `/about`.
- A new `home-config.json` drives the landing page: stored in the CMS bucket, read through the single private `getConfig` Cloud Function that also serves the profile and resume config (replacing `getProfile` and `getResumeConfig`; file names are shared constants), with an example file as fallback for missing keys, listed in `/admin/cms`, and shipped with placeholder items to edit later.
- All other gating (default-deny, roles, feature routes, the sign-in overlay on the About page's upcoming projects) is unchanged. Denied pages still redirect to `/`.

## Capabilities

### New Capabilities
- `landing-page`: the page served at `/` (content from the home config, sign-in, signed-in state, release notes) and the home config's storage, fallback and editing.

### Modified Capabilities
- `access-control`: `/about` joins `/` as a public page.
- `profile-content`: the bio page is served at `/about` and gains a link to the main site; the drawer lists an "About me" entry for signed-in users.

## Impact

- Code: `src/app/page.tsx` (landing), new `src/app/about/page.tsx`, `src/lib/access.ts`, `src/components/layout/` (Navbar, ReleaseNotes, AdminNav, ResumeNav), new landing component, `src/data/` (home config type, example), `src/middleware/` (home config service), `functions/src/` (new function and CMS listing), `terraform/functions/functions.tf` (`function_names`), `profile.example.json` (About me item).
- Docs: `CLAUDE.md`, `docs/DEPLOYMENT.md`, README.
- Deployment: `getConfig` replaces `getProfile` and `getResumeConfig` in stage 2 (a function delete, see design.md Risks).

## Out of Scope

Redesigning the bio sections, changing roles or permissions, new auth providers, and the final landing copy (placeholders only).
