# Proposal

## Why

Pages such as `/job-tracker`, `/resume-builder` and `/admin/*` are rendered by the server on every request, so after a click on a link nothing happens on screen until the new page arrives and the app feels stuck. The site already has a thin top progress bar (`ScrollProgress`) that only shows scroll position on the home page; the same bar can give navigation feedback on every page. Fixes #114.

## What Changes

- Add a global route-transition loader: the same bar as the scroll progress (position, height, primary color, stacking) animates while the app navigates to another page and the server renders it, completes when the new page is shown, then fades out.
- Mount it once from the root layout so every page has it.
- While a navigation is in progress the scroll progress bar on the home page is hidden, so there is only ever one bar; when idle it behaves as today.
- Navigation start is detected on the client from link clicks and back/forward; it ends when the path or query string changes, with a safety timeout so the bar can never stay stuck.
- Nothing is shown for navigations that finish almost at once, and nothing is shown under `prefers-reduced-motion`.
- Out of scope: skeletons and spinners inside pages, loading feedback for API calls (RTK Query snackbars), any change to how scroll progress looks, a `loading.tsx` per route, and server or deployment changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-language`: adds a requirement for navigation loading feedback next to the existing scroll-driven animation and reduced-motion requirements.

## Impact

- `src/components/ui/motion.tsx` (shared bar, `ScrollProgress` hides while navigating), a new client component `src/components/layout/RouteProgress.tsx`, a small client-only store `src/lib/navigationProgress.ts`, `src/app/layout.tsx` (mount).
- No new dependency (framer-motion is already used), no API, data, profile, infrastructure or deployment change.
- `CLAUDE.md` (scroll animation paragraph) is updated.
