# Design

## Context

Users are `allowed_emails/{lowercase email}` docs (`allowed`, `admin`). Clients may only `get` their own doc (`firestore.rules`); everything else is denied, and Cloud Functions use the Admin SDK. Sign-in happens in `UpcomingProjects.tsx` (`signInWithPopup` then `isEmailAllowed`) and `app/page.tsx` (`onAuthStateChanged`). `/admin` is one client page (`app/admin/page.tsx`) calling `/api/admin/cms`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:** register on first sign-in, manage role and access from `/admin/access`, keep legacy admin docs working, keep the browser -> Next.js -> private function architecture.

**Non-Goals:** Terraform changes, Firestore rules changes, audit log, hard delete.

## Decisions

1. **Registration is a server call, not a client write.** After a successful sign-in the client sends its ID token to a new Next.js route, which calls a private `registerUser` function. It verifies the token (verified email required), then runs a Firestore transaction: create the doc if absent, otherwise only set `lastLoginAt`. Alternative: relax `firestore.rules` to allow self-create; rejected because a client could then choose its own role and the rules are shared infrastructure.
2. **Order in the sign-in flow: register, then check.** `registerUser` runs before `isEmailAllowed`, so a first-time user passes the gate in the same sign-in. Registration failure falls back to the existing `isEmailAllowed` result (fail closed for unknown emails).
3. **Role model.** Docs carry `role: "reader" | "admin"`. Effective admin is `role === "admin" || admin === true`; a missing `role` reads as `reader` unless `admin` is true. Writes by the panel set `role` and keep `admin` in sync (`admin = role === "admin"`) so the legacy field and `requireAdmin` stay consistent. Alternative: migrate all docs to `role`; rejected because Terraform manages the seed docs and must not change.
4. **Revoke means `allowed: false`.** Reuses the existing gate semantics and keeps the record. No hard delete.
5. **Guards in the function, not the UI.** `adminSetUser` takes the acting admin's email from `requireAdmin` and rejects self-revoke, self-demote and changes that leave zero active admins (counted in the same transaction). The UI only disables the obvious buttons.
6. **Functions.** `registerUser`, `adminListUsers` (list of all docs, capped), `adminSetUser` (`action`: add, set-role, revoke, restore), all via `privateEndpoint()`; new `functions/src/users.ts` registered in `index.ts`. Next.js: `src/middleware/userService.ts` (server-only) and routes `/api/admin/users` and `/api/register`.
7. **Admin UI structure.** `app/admin/layout.tsx` holds the navbar (functional component, daisyUI `navbar`, semantic classes, theme toggle kept); the editor moves unchanged to `app/admin/cms/page.tsx`; `app/admin/page.tsx` redirects to `/admin/cms`; `app/admin/access/page.tsx` is the users table.
8. **Terraform interaction.** Terraform only creates seed admin docs for `allowed_admin_emails` and will reset `admin`/`allowed` on those docs if the resource is re-applied. Documented as an assumption: manage seed admins through Terraform, everyone else in the panel.

## Risks / Trade-offs

- Any verified Google account becomes a `reader` -> readers must see nothing beyond the already-gated content; checked during review.
- Terraform re-apply can reset a seed admin's flags -> documented in `docs/DEPLOYMENT.md`; the panel shows the effective role.
- Last-admin race between two admins -> counted inside a Firestore transaction.
- Listing all docs does not scale to very large user bases -> acceptable for this site; capped with a notice.
