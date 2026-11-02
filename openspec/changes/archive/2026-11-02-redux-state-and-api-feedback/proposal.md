# Proposal

Fixes #101.

## Why

The browser has no shared store. Shared and server-derived state is scattered over 117 `useState` calls in 24 files (session role in `app/page.tsx`, the open resume in `ResumeEditor`, applications in `JobTracker`, user and CMS lists in the admin pages), and each page hand-rolls its own fetch, loading and error handling. Feedback on API results is inconsistent: some pages toast, some show nothing, and loading uses spinners. One store and one feedback mechanism make the state predictable and the feedback uniform.

## What Changes

- Add Redux Toolkit and React Redux (browser only). A store provider mounts in the root layout as a client component; typed `useAppDispatch`/`useAppSelector` hooks.
- Hold in the store: session and role, drawer open state, the resume workspace (list, open resume `doc`, saved snapshot, save status), the job tracker (applications, cap, view filters, open form), admin lists (users, CMS files, orphaned resume owners) and notifications.
- Fetch and cache all `/api/*` data through one RTK Query API slice, replacing the per-page fetch/loading/error code and the `resumeClient`/`applicationClient`/`aiClient` `request` helpers' state handling. The HTTP status on errors (for example the 409 stale save) stays observable.
- Show every API outcome visually: a success snackbar for each successful mutation, an error snackbar for each failed call, an inline error state with retry where a page cannot render without its data.
- Use skeletons, not spinners, for full-page and list loading.
- Keep out of the store: the theme (CSS `:has()` plus the pre-paint script), and ephemeral UI state (hover, in-view, copied flag, ref and `ResizeObserver` measurements, tab pill position, collapsed-section preference in `localStorage`).
- Out of scope: Cloud Functions and `src/middleware/` server code, `src/proxy.ts` and access rules, the profile (stays server-provided through `ProfileProvider`), and new product features.

## Capabilities

### New Capabilities
- `client-state`: which application state lives in the Redux store, how server data is fetched and cached, and what stays outside it.
- `api-feedback`: the visual feedback every API response must produce (snackbars, inline error states, skeleton loading).

### Modified Capabilities

None. Existing capabilities (`resume-builder`, `job-application-tracker`, `admin-cms`, `user-access`) keep their observable behavior; only where their state lives and how outcomes are shown change, which the two new capabilities own.

## Impact

- Code: `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/resume/*`, `src/components/jobs/*`, `src/components/admin/*`, `src/app/admin/*`, `src/components/layout/*` (drawer, navbar), `src/lib/*Client.ts`, new `src/store/` and snackbar and skeleton components, `src/styles/`.
- Dependencies: `@reduxjs/toolkit`, `react-redux`; both lockfiles updated (pnpm lock kept current).
- No API, data or infrastructure changes; no deployment pipeline impact.
- Docs: `CLAUDE.md` and the README structure section.
