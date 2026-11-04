# Design

## Context

Snackbars live in a Redux queue rendered by `SnackbarHost`; `dismiss` removes an item so React unmounts it at once (only the enter animation exists, in CSS). The account menu reads `nav.dropdownItems` (`{ label, icon }`) and only the `log-out` icon does anything. `getProfile()` merges the stored profile over `profile.example.json` and normalizes drawer items from older shapes (`profileService.ts`); `lib/drawer.ts` decides visibility for the drawer using `can()` and `requiredPermission()`. `applicationList` already lists the owner's resume objects (`liveResumeIds`) to clear stale links, and each object's metadata holds the resume title (`resumes.ts`). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Exit animation and sibling reflow for snackbars without changing the store contract or the "components never dispatch toasts" rule.
- Account menu behavior driven by profile config, backward compatible with stored profiles.
- Resume title in the tracker list with no extra network round trip and no extra storage read.

**Non-Goals:**
- Profile/Settings pages, a generic action registry, or per-item permissions in config (the route table in `access.ts` stays the one policy).

## Decisions

1. **Snackbar animation with framer-motion `AnimatePresence`** (`motion.div` with `layout`, exit fade and rise), reading reduced motion through the existing safe hook in `ui/motion.tsx` so SSR and hydration match; the `.snackbar` CSS enter keyframe is removed. Alternative: a `leaving` flag in the store plus a CSS `snackbar-out` keyframe and `animationend`; rejected as more plumbing (store state, timers) for the same result, and framer-motion is already the project's animation library.
2. **Account menu entry shape** `{ id, label, icon, enabled, action: 'link' | 'sign-out', href }`, mirroring `drawerItems`. A `normalizeDropdownItems` beside `normalizeDrawerItems` handles legacy `{ label, icon }`: `log-out` becomes enabled `sign-out`; others become disabled. `getProfile()` replaces the array wholesale (arrays are not deep-merged), as for the drawer, so a stored list is never mixed with example entries. Alternative: keep `icon === 'log-out'` as the sign-out switch; rejected because behavior should come from the action, not the icon.
3. **Visibility in a pure helper** `visibleMenuItems(items, role)` next to `lib/drawer.ts`: enabled, and for internal `href` (starts with `/`) the role holds `requiredPermission(href) ?? 'site:view'`; external `http(s)` URLs need no permission. Internal links use `next/link`; external open with `target="_blank" rel="noopener noreferrer"`. `href` values that are neither are dropped. The server still enforces the route permission.
4. **Example profile** ships Profile and Settings with `enabled: false` (no pages exist) and Log out enabled, so default behavior does not regress.
5. **Resume title from the function.** `liveResumeIds` becomes `liveResumes` returning `Map<id, title>` from the same `getFiles` listing; `applicationList` adds `resumeTitle: string | null` (null whenever `resumeId` is null). `ApplicationSummary` gains `resumeTitle`. The existing invalidation of the `Applications` tag after `createTailoredResume` refreshes the column. Alternative: join client-side with `listResumes`; rejected as a second query for data the function already holds. `applicationGet` is unchanged.

## Risks / Trade-offs

- [Resume metadata title missing] → fall back to "Untitled", as `resumeList` does.
- [`layout` animations jitter with a fixed top toast stack] → verify in the browser with 3-4 simultaneous snackbars; fall back to exit-only animation if the reflow misbehaves.
- [Stored profile with old dropdown shape] → covered by normalization; verify by loading `profile.example.json` variants.
- [Functions change] → ships in the stage 2 deploy; the web change tolerates a missing `resumeTitle` (blank cell) so deploy order cannot break the page.
