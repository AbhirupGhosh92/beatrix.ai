# Design

## Context

Users are `allowed_emails/{lowercase email}` docs. Since `access-control` (PR #72) the site has server-verified sessions: `sessionCreate` turns a fresh ID token into a session cookie for allow-listed emails, `sessionVerify` re-reads the role on every request, `src/proxy.ts` gates routes with `src/lib/access.ts` (roles `reader < user-base < user-advanced < admin`, `cms:write` for `/admin` and `/api/admin`), and `functions/src/policy.ts` mirrors the policy (`resolveRole`, `can`). Admin functions use `requirePermission(idToken, "cms:write")`. `/admin` is one client page calling `/api/admin/cms`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:** register on first sign-in, manage role and access from `/admin/access`, reuse the existing role model and permission checks, keep the browser -> Next.js -> private function architecture.

**Non-Goals:** Terraform changes, Firestore rules changes, new roles or permissions, audit log, hard delete.

## Decisions

1. **Registration lives inside `sessionCreate`.** After verifying the ID token and before resolving the role, `sessionCreate` runs a Firestore transaction that creates the doc as a `reader` only when it does not exist, otherwise only touches `lastLoginAt`. The role is then resolved as before (a revoked user still gets 403). So a first-time user is registered and signed in by one request, no new client call, route or helper. Alternative: a separate `registerUser` function called from the browser before sign-in (my first design); rejected because the session flow already exists, it would add a second round trip and a window where registration succeeded but the session check ran first.
2. **Reuse the policy, add nothing to it.** Roles, `can()` and `resolveRole` come from `functions/src/policy.ts`; the Access page's role picker lists `ROLES` from `src/lib/access.ts`. The new functions require `cms:write`. The route gate already protects `/admin/*` and `/api/admin/*`.
3. **Only `role` is written by the panel.** New docs carry `role` and `allowed`; `resolveRole` lets a valid `role` win over a legacy `admin: true`, so a demoted legacy admin really loses admin without touching the legacy flag. Alternative: keep `admin` in sync; rejected as unnecessary under `resolveRole`.
4. **Revoke means `allowed: false`.** Reuses the existing gate semantics and keeps the record. No hard delete.
5. **Guards in the function, not the UI.** `adminSetUser` gets the actor's email from `requirePermission` and rejects self-revoke, self-demote (own role set to anything but `admin`) and any change that leaves no active admin. Active admins are counted inside the transaction over the (capped) user collection using `resolveRole`, so legacy admin docs count. The UI only disables the obvious buttons.
6. **Functions.** `adminListUsers` and `adminSetUser` (`action`: add, setRole, revoke, restore) via `privateEndpoint()` in `functions/src/users.ts`, plus an exported `registerIfAbsent(email, name)` used by `sessionCreate`. Next.js: `src/middleware/userService.ts` (server-only), `routeHelpers.ts` and `/api/admin/users`.
7. **Admin UI structure.** `app/admin/layout.tsx` holds the navbar (`AdminNav`, functional component, semantic classes, theme toggle kept); the editor moves unchanged to `app/admin/cms/page.tsx`; `app/admin/page.tsx` redirects to `/admin/cms`; `app/admin/access/page.tsx` is the users table.
8. **Branch hygiene.** The branch merges `origin/main` so `sessionCreate`/`sessionVerify` stay in the deployed source; a deploy must never need `allow_destructive` for this change.
9. **Terraform interaction.** Terraform only creates seed admin docs for `allowed_admin_emails` and will reset those docs' `admin`/`allowed` fields if re-applied. Documented: manage seed admins through Terraform, everyone else in the panel.

## Risks / Trade-offs

- Any verified Google account becomes a `reader` (can view `/`-gated content only) -> that is the requested default; readers hold only `site:view`.
- Terraform re-apply can reset a seed admin's flags -> documented in `docs/DEPLOYMENT.md`; the panel shows the effective role.
- Last-admin race between two admins -> counted inside a Firestore transaction.
- Listing all docs does not scale to a very large user base -> capped at 500 with a notice.
- Registration changes the allow-list from closed to open-as-reader -> the `access-control` delta states it explicitly.
