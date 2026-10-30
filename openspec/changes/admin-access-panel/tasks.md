# Tasks

## 1. Backend functions

- [x] 1.1 Update `requireAdmin` in `functions/src/auth.ts` to accept `role === "admin"` or `admin === true`, and verify with `pnpm --prefix functions build`
- [x] 1.2 Add `functions/src/users.ts` with `registerUser` (create-only transaction, updates `lastLoginAt` for existing docs) and verify with `pnpm --prefix functions build` plus a run against the Firebase emulator or dev project showing first sign-in creates a `reader` doc and a second changes only `lastLoginAt`
- [x] 1.3 Add `adminListUsers` and `adminSetUser` (add, set-role, revoke, restore) with self-lockout and last-admin guards in a transaction, export them in `functions/src/index.ts`, and verify 400 on self-revoke, self-demote, last admin and invalid role, 403 for non-admins

## 2. Next.js server layer

- [x] 2.1 Add `src/middleware/userService.ts` (server-only) and routes `/api/admin/users` and `/api/register` with `Cache-Control: no-store` and 401 on a missing token; verify `npm run typecheck` and a curl without a token returns 401
- [ ] 2.2 Call the register route from the sign-in flow (`UpcomingProjects.tsx`, `app/page.tsx`) before `isEmailAllowed`, falling back to the existing check on failure; verify in the browser that a new account gets in on first sign-in

## 3. Admin UI

- [x] 3.1 Add `app/admin/layout.tsx` with the top navbar (CMS, Access, active highlight, theme toggle), move the editor to `app/admin/cms/page.tsx` and redirect `/admin`; verify by browser check in both themes at 320px and desktop
- [ ] 3.2 Add `app/admin/access/page.tsx`: users table, add by email, revoke/restore, role select, error toasts, disabled self-actions; verify each action against a dev project and that a non-admin sees 403

## 4. Specs and docs

- [x] 4.1 Update `CLAUDE.md`, `docs/DEPLOYMENT.md` (functions list, Terraform seed-admin note) and README, and verify `npm run check`, `npm run build` and `openspec validate --all` pass

## Workflow follow-up

- Run `/opsx:archive` before the PR is ready and commit the merged specs.
