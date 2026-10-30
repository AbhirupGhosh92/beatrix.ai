# Tasks

## 1. Policy module (roles, permissions, routes)

- [x] 1.1 Add the shared policy module (ordered roles `reader < user-base < user-advanced < admin`, permission sets `site:view`, `features:basic`, `features:advanced`, `cms:write`, the public-path list and the stricter-route table, and a pure `can(role, permission)`), with no server-only imports so both server and client can use it. Verify `npm run typecheck` passes and that `can('admin', *)` is true, `can('reader', 'cms:write')` is false and each role inherits the one below (checked with a throwaway script or the `openspec` scenarios by hand).
- [x] 1.2 Add a pure role-resolution function for an `allowed_emails` entry (`allowed === false` -> none; valid `role` -> that role; `admin: true` -> `admin`; otherwise, and for unknown values, `reader`). Make it importable by `functions/` (shared source or a mirrored copy with a comment pointing at the other) and verify the three spec scenarios (no role, legacy admin, unknown role) by running it on sample entries.

## 2. Session and permission functions (functions/, the only place using firebase-admin)

- [x] 2.1 Replace `requireAdmin` in `functions/src/auth.ts` with `requirePermission(idToken, permission)` built on the role resolution; update `functions/src/admin.ts` so all three admin functions require `cms:write`. Verify `pnpm --prefix functions build` passes and the legacy `admin: true` seed entry still resolves to admin.
- [x] 2.2 Add private function `sessionCreate` (ID token + `email_verified` + allow-list check -> `createSessionCookie` value and expiry; 401/403 otherwise) and `sessionVerify` (cookie -> `verifySessionCookie(cookie, true)` then re-read `allowed_emails/{email}` -> `{ email, role }`, or 401 for invalid/expired/revoked/`allowed: false`), both via `privateEndpoint`, exported from `functions/src/index.ts`. Verify the functions build and, against `dev` or the emulator, that a valid token yields a cookie, a tampered cookie yields 401, and flipping `allowed` to false or changing `role` changes the very next `sessionVerify` answer.
- [x] 2.3 Confirm `firestore.rules` needs no change (the owner can already read their own `allowed_emails` document) and record that in the PR; if the client still reads the allow-list anywhere after group 4, remove that read. Verify with `grep` that nothing in `src/` calls `isEmailAllowed` after group 4.

## 3. Next.js server: session endpoints and the gate

- [x] 3.1 Add a server-only session service in `src/middleware/` that wraps `sessionCreate`/`sessionVerify` with `callCloudFunction` and caches nothing about the role. Verify `npm run typecheck` passes and importing it from a client component fails the build.
- [x] 3.2 Add `src/app/api/auth/session/route.ts` (`POST` with `{ idToken }` sets the `httpOnly`, `SameSite=Lax`, `Path=/` cookie, `Secure` outside development, `Cache-Control: no-store`; `DELETE` clears it) and `src/app/api/auth/me/route.ts` (returns `{ role }` for the current session, 401 when anonymous). Verify with `curl` against `npm run dev` that a non-allow-listed token creates no cookie and an allowed one does.
- [x] 3.3 Add `src/proxy.ts` with the default-deny gate: public paths pass; otherwise call `sessionVerify` with the cookie; no/invalid session -> redirect to `/` (pages) or 401 with `no-store` (`/api/*`) and clear a bad cookie; role lacking the route's permission -> redirect (pages) or 403 (`/api/*`); unreachable `sessionVerify` -> deny. Verify `npm run build` passes, `GET /admin` and `GET /some-new-route` redirect to `/` while logged out, `/` and static assets still load, and `/api/admin/cms` returns 401.
- [x] 3.4 Make `/api/admin/cms` use the same permission check (reject below `cms:write` with 403 before calling the functions). Verify a signed-in `reader` gets 403 and an `admin` still lists, reads and saves CMS files.

## 4. Client sign-in, sign-out and role-aware UI

- [x] 4.1 In `UpcomingProjects.tsx`, after `signInWithPopup` exchange the ID token via `POST /api/auth/session` instead of reading the allow-list in the browser; on failure sign out of Firebase and show the existing restricted-email error. Remove the client-only `demo-api-key` login shortcut and the Firebase-not-configured `isEmailAllowed` allow-all path. Verify in the browser: an allow-listed account logs in, a non-allow-listed account is rejected with the existing message and receives no cookie.
- [x] 4.2 In `NavbarDropdown.tsx`, sign out by calling `DELETE /api/auth/session` as well as Firebase `signOut`. Verify after logout that `/admin` redirects to `/`.
- [x] 4.3 In `src/app/page.tsx`, derive `isLoggedIn` and the role from `GET /api/auth/me` (not from Firebase client state alone), and show drawer and navbar entries only when `can(role, permission)` allows them. Verify manually as `reader`, `user-base`, `user-advanced` and `admin` (set the role in Firestore for a test account) that only the permitted entries appear and that the `/admin` link shows for `admin` only.

## 5. Role-change behaviour and end-to-end checks

- [x] 5.1 Check "role changes take effect immediately" end to end in `dev`: with an admin signed in, set their `role` to `reader` in Firestore and verify the next request to `/admin` and to `/api/admin/cms` is denied without re-login; set `allowed: false` and verify the next protected request is treated as anonymous. Record the results in the PR Verification section.
- [x] 5.2 Run `npm run typecheck`, `npm run lint`, `npm run build`, `pnpm --prefix functions build`, `openspec validate --all`, and a manual browser pass of every scenario in `specs/access-control/spec.md` and `specs/admin-cms/spec.md` in both themes; list only the checks actually run in the PR.
- [x] 5.3 Confirm the deploy ordering assumption: the `functions` component (with `sessionVerify`) is live before App Hosting serves the new `proxy.ts`. Verify by reading `scripts/deploy-backend.sh` and the `deploy-environment.yml` step order; if App Hosting can roll out first, document the required ordering or adjust the pipeline in a way that keeps the deployment safety rules in `.claude/rules/environments.md`.

## 6. Documentation

- [x] 6.1 Update the docs this change makes inaccurate and verify each by re-reading it against the code: `CLAUDE.md` (State of the project, Deployment architecture and Component layout: session cookie, `src/proxy.ts`, policy module, `sessionCreate`/`sessionVerify`, roles), `docs/DEPLOYMENT.md` (new functions, deploy order, how to promote a user's `role`, emergency revocation with `revokeRefreshTokens`), `terraform/README.md` if the admin seed description changes, and the README (run `scripts/update-readme.mjs` if the structure sections change).

## Workflow follow-up

- Run `/opsx:archive` before the PR is ready so the deltas merge into `openspec/specs/`, and commit the result.
- Open the PR from `feature/71-fixes-protect-every-route-except-w` with `Fixes #71`, in the standard PR format.
- Deploy to `prod` only by the manual release workflow, and only when asked.
