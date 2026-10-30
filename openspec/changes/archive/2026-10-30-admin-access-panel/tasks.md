# Tasks

## 1. Merge main and backend functions

- [x] 1.1 Merge `origin/main` into the branch, resolve the conflicts in favour of main's session flow, drop `registerUser`, `src/lib/register-user.ts`, `/api/register` and the client sign-in edits, and verify `git diff origin/main` shows no change to `src/app/page.tsx` or `UpcomingProjects.tsx` and `pnpm build` in `functions/` passes
- [x] 1.2 Add `registerIfAbsent` (create-only transaction, updates `lastLoginAt` otherwise) in `functions/src/users.ts` and call it from `sessionCreate` before the role check; verify against the Firebase emulators that an unknown verified email gets a `reader` doc and a session, a second sign-in changes only `lastLoginAt`, a revoked user gets 403 and stays revoked, and concurrent first sign-ins create one doc
- [x] 1.3 Add `adminListUsers` and `adminSetUser` (add, setRole, revoke, restore) requiring `cms:write`, with self-lockout and last-admin guards in a transaction, export them in `functions/src/index.ts`, and verify 400 on self-revoke, self-demote, last admin and unknown role, 403 for a `user-advanced` caller, and that a legacy `admin: true` doc counts as admin

## 2. Next.js server layer

- [x] 2.1 Keep `src/middleware/userService.ts` (list and update only) and `routeHelpers.ts` with `/api/admin/users`; verify `npm run typecheck` and a curl without a token returns 401 with `no-store`
- [x] 2.2 Verify in a browser on a deployed environment that a never-seen Google account signs in on first try as a `reader`, and a revoked account is refused

## 3. Admin UI

- [x] 3.1 Keep `app/admin/layout.tsx` with the top navbar (CMS, Access, active highlight, theme toggle), the editor at `app/admin/cms/page.tsx` and the `/admin` redirect; verify by browser check in both themes at 320px and desktop
- [x] 3.2 Update `app/admin/access/page.tsx` to offer all four roles from `ROLES` and verify each action (add, role change, revoke, restore, blocked self-actions) against a deployed environment as an admin, and that a non-admin is refused

## 4. Specs and docs

- [x] 4.1 Update `CLAUDE.md`, `docs/DEPLOYMENT.md` (functions list, Terraform seed-admin note) and README for the merged model, and verify `npm run check`, `npm run build` and `openspec validate --all` pass

## Workflow follow-up

- Run `/opsx:archive` before the PR is ready and commit the merged specs.
