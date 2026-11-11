# Design

## Context

The root layout (`src/app/layout.tsx`) is `force-dynamic` and awaits `getProfile()`, so every navigation to a server-rendered page waits on the server with no feedback. `ScrollProgress` (`src/components/ui/motion.tsx`) is a fixed `h-0.5` `bg-primary` bar at `z-50` driven by `useScroll`, mounted only in `src/app/page.tsx`. Links are `next/link` in six components (`ApplicationTable`, `ApplicationForm`, `AdminNav`, `NavbarDropdown`, `ResumeNav`, `DrawerMenu`); no code calls `useRouter`. There is no `loading.tsx`. See proposal.md for motivation and the spec delta for requirements.

## Goals / Non-Goals

**Goals:**
- One shared bar, one place to mount it, no edit to the existing links.
- No flash for fast navigations, no stuck bar for slow, failed or interrupted ones.

**Non-Goals:**
- Real progress values (the server cannot report them); the animation is a trickle, not a measurement.
- Redux state: this is a transient visual flag, like hover and in-view flags that stay local on purpose.

## Decisions

1. **Detect navigation start with one capture-phase `click` listener on `document` plus `popstate`, not `useLinkStatus` or `loading.tsx`.**
   `useLinkStatus` only works inside each `Link`'s child and would need all six components edited and every future link too. A `loading.tsx` cannot cover time spent in the root layout (`getProfile()`), and it would need one per route. The listener ignores events that are `defaultPrevented`, non-primary button, modified (ctrl/meta/shift/alt), anchors with `target` other than `_self`, `download`, a different origin, or the same path and query (hash-only changes included). Alternative: wrapping `Link`; rejected as invasive.

2. **End navigation when `usePathname()` or `useSearchParams()` changes**, read in `RouteProgress` wrapped in `<Suspense fallback={null}>` (required by `useSearchParams`). Query changes matter because `/resume-builder?open=<id>` is a real navigation.

3. **A tiny client-only store `src/lib/navigationProgress.ts`** (`startNavigation()`, `finishNavigation()`, `subscribe`, `getNavigating()`) read with `useSyncExternalStore`. It lets `ScrollProgress` hide itself while navigating without Redux or prop passing. `startNavigation()` is also the hook for any future programmatic `router.push`.

4. **One bar, two sources.** The bar's classes (`fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary`) are extracted so both share them. `RouteProgress` is mounted in the root layout; `ScrollProgress` stays in `page.tsx` and returns `null` while `getNavigating()` is true.

5. **Animation.** After a 120 ms delay (nothing shown for fast navigations) `scaleX` animates from 0 toward ~0.85 with an ease-out over a few seconds (framer-motion `animate`); on finish it animates to 1 in ~200 ms, then opacity to 0, and resets. Uses the existing `EASE`.

6. **Guards.** A new `startNavigation()` while one is active restarts the timer (replaced navigation); a 15 s timeout calls `finishNavigation()` so a failed or hung navigation never leaves the bar. Reduced motion (`useSafeReducedMotion`) renders nothing and never sets visual state, consistent with the other motion components.

## Risks / Trade-offs

- [Click on a link Next does not treat as client navigation, so no pathname change follows] → the 15 s timeout, plus ignoring same-URL, `target`, `download` and cross-origin links.
- [Next prefetched the page, so navigation is instant] → the 120 ms delay hides the bar.
- [Navigation error page keeps the same pathname] → the timeout ends the bar; accepted.
- [Programmatic `router.push` added later is not detected] → document `startNavigation()` in CLAUDE.md.
- [Hydration mismatch] → nothing renders on the server (state starts idle) and reduced motion uses the existing safe hook.

## Open Questions

- Exact trickle duration and target (~0.85) are tuned during manual browser checks with network throttling; this does not change the spec.
