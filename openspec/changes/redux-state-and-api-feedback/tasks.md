# Tasks

## 1. Store and feedback foundation

- [ ] 1.1 Add `@reduxjs/toolkit` and `react-redux` with pnpm and keep `package-lock.json` consistent; verify `npm run build` still passes
- [ ] 1.2 Create `src/store/` (store factory, typed hooks, root reducer) and a client `StoreProvider` in `src/app/layout.tsx`; verify `npm run typecheck` and the home page renders
- [ ] 1.3 Add the `notifications` slice, a `Snackbar` host (daisyUI toast/alert, aria-live, reduced motion) and its styles in `src/styles/components/`; verify a dispatched success and error snackbar show, stack and dismiss in both themes
- [ ] 1.4 Add `Skeleton` building blocks (row, card, page) in `components/ui/` and styles; verify they render without layout shift and without animation under reduced motion
- [ ] 1.5 Add the RTK Query API over `/api/*` with a status-preserving error and a listener middleware that raises snackbars from outcomes (endpoint metadata for message and opt-out); verify a forced failing call shows an error snackbar

## 2. Session and layout state

- [ ] 2.1 Move role/session (`GET /api/auth/me`) and drawer state from `app/page.tsx` into the store; verify the anonymous page has no drawer or menu button and a signed-in page shows them by role
- [ ] 2.2 Replace sign-in/out result handling with store-driven snackbars; verify success and failure feedback on `POST/DELETE /api/auth/session`

## 3. Job tracker

- [ ] 3.1 Move applications, cap and filters/sort/open-form state into the store using the API slice; verify list, search, filters, add at cap and delete as before
- [ ] 3.2 Show skeleton rows while loading, an inline error with Retry on failure, and success/error snackbars for create, update, delete and tailored-resume actions; verify each path by hand

## 4. Admin

- [ ] 4.1 Move users, CMS files/content and orphaned resume owners onto the API slice, replacing the local toast state; verify add/role/revoke/restore, CMS save and purge feedback
- [ ] 4.2 Skeletons and inline error with Retry for the admin lists; verify with a failing request and throttled network

## 5. Resume builder

- [ ] 5.1 Move the resume list, config and `openId` into the store and API slice with skeleton loading and error state; verify create, open, rename, delete and the base-user cap message
- [ ] 5.2 Move the workspace `doc`, saved snapshot and save status into a slice; preview, score and AI panel read from the store; verify dirty indication, explicit save (base) and autosave (advanced), and the 409 stale-save path
- [ ] 5.3 AI actions (Skill Match, Tailor) go through the API slice with snackbars and a skeleton result area; verify success and failure

## 6. Cleanup and checks

- [ ] 6.1 Remove replaced per-page loading/error/toast state, the two `loading-spinner` uses and unused client helpers; verify `grep` finds no page-level spinner or duplicate fetch state
- [ ] 6.2 Run `npm run check` and `npm run build`; manual browser check in both themes at 320px and 1920px, including the theme with no flash; verify and record results
- [ ] 6.3 Docs: update CLAUDE.md (state, component layout, styling), the README structure section and `docs/DEPLOYMENT.md` only if affected (state expected "none")

## Workflow follow-up

- Run `/opsx:archive` before the PR is ready; commit the archived result.
