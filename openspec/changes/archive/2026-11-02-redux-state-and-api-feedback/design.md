# Design

## Context

See proposal.md for motivation. Observed today: no store; `ProfileProvider` context for the profile; each of `ResumeBuilder`, `ResumeEditor`, `JobTracker`, `admin/access`, `admin/cms` and `OrphanedResumes` owns its fetch/loading/error state; `resumeClient.ts`, `applicationClient.ts` and `aiClient.ts` each define a `request` helper; only the admin pages and `CopyEmailButton` show toasts; two places use `loading-spinner`. The theme is stateless by design (daisyUI controller plus a pre-paint script). Server components cannot read a client store, and `src/proxy.ts` enforces access, so the store never decides access.

## Goals / Non-Goals

**Goals:** one store for shared and server state; one place that turns API outcomes into snackbars; skeletons for page and list loading; no behavior change.

**Non-Goals:** server or Cloud Function changes; moving the profile into Redux; persisting the store; redux-persist; undo/redo (none today, by decision).

## Decisions

1. **Redux Toolkit with RTK Query.** Slices for `session`, `ui` (drawer), `resumeWorkspace` (open `doc`, saved snapshot, save status), `trackerView` (filters, open form) and `notifications`. Server data (resumes, applications, users, CMS files, owners, AI actions) lives in one RTK Query API over the existing `/api/*` routes. Alternative: hand-written thunks and slices for every fetch: more code and duplicated loading/error flags.
2. **Keep the client modules as the typed surface.** The endpoint definitions reuse the types in `resumeTypes.ts` and `applicationTypes.ts`; the error object keeps `status` so 409 handling is unchanged. Alternative: delete the clients and inline `fetch`: loses the shared error type.
3. **Notifications from a listener middleware.** One listener watches fulfilled and rejected mutations and rejected queries and enqueues a snackbar; endpoints opt out or supply a message through endpoint metadata (autosave opts out of success). Alternative: dispatch from every call site, which is what makes feedback inconsistent today.
4. **Snackbar host and skeletons use daisyUI** (`toast` and `alert`, `skeleton`) as semantic components in `components/ui/`, styled by named classes in `src/styles/components/` using theme tokens, honoring `prefers-reduced-motion`. The host renders once in the root layout, after the page, with `role="status"`/`aria-live` (assertive for errors).
5. **Provider placement.** A client `StoreProvider` wraps children in `src/app/layout.tsx`, next to `ProfileProvider`; the store is created per request/tree, not as a module singleton, so server rendering never shares state between users.
6. **Resume workspace.** `doc` moves into the slice; `dirty` stays derived (current doc against the saved snapshot) via a selector; autosave stays a component effect that dispatches the save mutation, preserving its timing and the generation quoting for 409s. Preview, score and AI panel select from the store instead of receiving props.
7. **Stays local:** theme, hover/in-view/copied flags, refs and `ResizeObserver` values, the skills tab pill, and the collapsed-section preference (`localStorage`, per browser).
8. **Migration slice by slice**, each leaving the app working: store and host, then session/drawer, tracker, admin, resume builder, finally removal of old per-page state.

## Risks / Trade-offs

- Autosave regressions in `ResumeEditor` → move it last, keep the same timers, verify save, conflict and offline by hand.
- Hydration: store created on the server then used on the client → initial state is empty/loading, filled client-side; no `window` access at creation.
- Bundle size grows by the Redux libraries → accepted; imported only through the provider.
- Skeleton and snackbar styles must pass contrast and reduced-motion checks in both themes → manual check at 320px and 1920px.
- No test runner exists → verification is `npm run check`, `npm run build` and stated browser checks.
