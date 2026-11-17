# Proposal

Fixes #132

## Why

Owner feedback on the landing page and the bio page after the landing/About split: the version row at the bottom of `/` is unevenly padded (a large empty band below it, sized for a floating button that `/` does not have), `/` has no scroll-to-top button, and `/about` still has a "Main site" link back to `/`.

## What Changes

- The version row at the bottom of `/` gets even vertical spacing and stays fully visible and clickable beside the scroll-to-top button at every width.
- `/` shows the same scroll-to-top button as `/about`, for anonymous and signed-in visitors.
- `/about` no longer shows a link or redirect back to `/` (the "Main site" button is removed from its navbar). The bio page is otherwise unchanged.

## Capabilities

### Modified Capabilities
- `landing-page`: the landing page has a scroll-to-top button.
- `release-notes`: the version row has even spacing.
- `profile-content`: the bio page no longer carries a link to `/`.

## Impact

- Code: `src/app/page.tsx`, `src/app/about/page.tsx`, `src/components/layout/ReleaseNotes.tsx`, `src/components/layout/Navbar.tsx`, and the `nav.mainSiteLabel` profile key if nothing else uses it (the design decides).
- Docs: `CLAUDE.md` (it mentions the "Main site" link and `mainSiteLabel`).
- No API, data, access or deployment change.

## Assumptions (owner to confirm at the proposal gate)

"Remove redirection to home from the bio page" is read as removing the "Main site" navbar button on `/about`. After this, the only ways back to `/` from `/about` are the browser's back button or the URL.

## Out of Scope

Any other change to the landing or bio content, a new way to return to `/` from `/about`, and the scroll-to-top button's look or behavior (reused as is).
