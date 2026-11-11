# Tasks

## 1. Navigation state

- [ ] 1.1 Add `src/lib/navigationProgress.ts` (`startNavigation`, `finishNavigation`, `subscribe`, `getNavigating`, 15 s safety timeout, restart on repeated start); verify `npm run typecheck` passes.

## 2. Loader bar

- [ ] 2.1 In `src/components/ui/motion.tsx` extract the shared bar classes and make `ScrollProgress` return `null` while navigating; verify the home page scroll bar still works when idle (manual) and `npm run typecheck` passes.
- [ ] 2.2 Add `src/components/layout/RouteProgress.tsx` (`'use client'`, click and `popstate` listeners with the ignore rules from design.md, `usePathname`/`useSearchParams` completion inside `Suspense`, 120 ms delay, trickle then complete and fade, nothing under reduced motion); verify `npm run lint` passes.
- [ ] 2.3 Mount `RouteProgress` in `src/app/layout.tsx`; verify `npm run build` passes with no hydration or Suspense errors.

## 3. Verification

- [ ] 3.1 Manual browser check with network throttled, in both themes: `/` to `/job-tracker` and `/resume-builder` and back shows one bar that finishes and fades; instant navigation shows none; ctrl-click, same-URL and external links show none; back/forward works; emulated `prefers-reduced-motion` shows none; a navigation interrupted by another leaves no stuck bar.

## 4. Docs

- [ ] 4.1 Update `CLAUDE.md` (scroll animation paragraph: `RouteProgress`, `navigationProgress.ts`, `startNavigation()` for programmatic navigation); `docs/DEPLOYMENT.md` and `README` need no change (no pipeline or script change), confirm `scripts/update-readme.mjs` leaves the README unchanged.

## Workflow follow-up

- Run `/opsx:archive` before the PR is ready and link the archived change in the PR's Changes section.
