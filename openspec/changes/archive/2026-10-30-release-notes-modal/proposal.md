# Proposal

## Why

Release branches exist but publish nothing, and visitors cannot tell which version they are on or what changed. Fixes #77.

## What Changes

- Pushing `release/<major.minor[.patch]>` creates tag `vX.Y.Z` and a GitHub release marked Latest, with the notes from `RELEASE_NOTES.md` on that branch.
- The very bottom of the page shows the latest release version; clicking it opens a modal with that release's concise, end-user notes.
- No **BREAKING** changes.

## Capabilities

### New Capabilities
- `release-notes`: publishing a GitHub release from a release branch and showing the latest release and its notes in the app.

### Modified Capabilities
<!-- None -->

## Impact

- `.github/workflows/release.yml`, `RELEASE_NOTES.md` convention.
- `src/middleware/releaseService.ts`, `src/components/layout/ReleaseNotes.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`.
- `CLAUDE.md`, `docs/DEPLOYMENT.md`.
