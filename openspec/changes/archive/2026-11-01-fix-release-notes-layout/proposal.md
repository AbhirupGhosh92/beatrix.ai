# Proposal

## Why

On the live page the release version button is hidden behind the floating back-to-top button, and in the light theme the release notes modal is close to unreadable (pale text on a white box) with a stray blank row above the title. Both defects were reproduced in the running app at 1280x800.

Fixes #<issue-id> (the GitHub issue must be created first; its ID names the branch, per `.claude/rules/github-workflow.md`).

## What Changes

- The version row at the bottom of the page keeps clear of the back-to-top button, so the version is fully visible and clickable when the page is scrolled to the bottom (the version stays the very last element).
- The release notes modal text (title and notes) uses the page's normal text colour and is readable in both themes.
- The modal's close control sits in the top-right corner instead of taking its own row above the title, so the box padding is even.
- The backdrop's close control is invisible (it only needs an accessible name), so no stray "close" bar appears on screen.
- The version button renders as the small ghost button it is declared as.

Out of scope: redesigning the back-to-top button, moving the version into the footer, changing how releases are published or fetched, and changing the notes content or its plain-text rendering.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `release-notes`: adds requirements that the version stays visible next to the back-to-top button and that the notes modal is readable and evenly padded in both themes.

## Impact

- `src/components/layout/ReleaseNotes.tsx` (markup and classes of the version row, dialog and its close buttons).
- `src/styles/` (a small rule in the matching concern file if the unlayered global `button` rule has to be overridden, see CLAUDE.md "Layering status").
- No API, data, profile schema or deployment changes.
