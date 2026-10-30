# Proposal

Fixes #71 (branch `feature/71-fixes-protect-every-route-except-w`)

## Why

Authentication is entirely client-side today: Firebase Auth state lives in the browser and is sent as a bearer token only by the `/admin` page's own fetch calls. The server never knows who is navigating, so a logged-out visitor can load `/admin` (and any future route) and only its API calls fail. Authorization is a single `admin: true` boolean checked in one Cloud Function helper. Feature work is about to start, so both a real route gate and a role model that can grow with the features are needed first.

## What Changes

- Add a server-verified session: after Google sign-in the browser exchanges its Firebase ID token for an `httpOnly`, `Secure`, `SameSite=Lax` Firebase session cookie; sign-out clears it.
- Add `src/proxy.ts` (Next 16 request proxy) that applies a **default-deny** gate: every route except `/` and static assets requires a valid session; pages redirect to `/`, `/api/*` answers 401.
- Introduce roles `reader < user-base < user-advanced < admin` (plus the unauthenticated `anonymous`) and a single policy module mapping roles to permissions and routes to required permissions. Proxy, API routes, Cloud Functions and UI helpers all read it.
- Store the role as `role` on `allowed_emails/{email}`. A document with no `role` is `reader`; a legacy document with `admin: true` and no `role` is `admin`.
- Re-read the role from Firestore on every protected request, so a role change or revocation (`allowed: false`) takes effect immediately.
- Replace `requireAdmin` with a generic permission check (`requirePermission`) used by the admin Cloud Functions; `/admin` and `/api/admin/*` require `cms:write` (admin only).
- Show or hide UI (drawer, navbar entries) with the same `can(role, permission)` helper; the UI never decides access on its own.
- **BREAKING**: a logged-out request to any path other than `/` is now redirected/401 instead of being served; `/admin` no longer renders for non-admins.

Out of scope: a role-management screen (roles are set in Firestore / Terraform / the seed script for now), the actual basic and advanced features (only their permission names are reserved), new sign-in providers, and rate limiting.

## Capabilities

### New Capabilities
- `access-control`: sessions, role hierarchy, permission policy, default-deny route gating and immediate role changes.

### Modified Capabilities
- `admin-cms`: the admin gate becomes the `cms:write` permission (role `admin`) instead of the `admin: true` flag, and `/admin` is gated at the route level.

## Impact

- New: `src/proxy.ts`, a policy module (roles, permissions, route table), session endpoints under `src/app/api/auth/`, a server-only session/role service in `src/middleware/`, and two new private Cloud Functions, `sessionCreate` and `sessionVerify`, in `functions/` (the only place `firebase-admin` is used) for creating and verifying session cookies.
- Changed: `functions/src/auth.ts` (generic permission check), `src/app/page.tsx`, `UpcomingProjects.tsx` and `NavbarDropdown.tsx` (session login/logout, role-aware UI), `firestore.rules` (allow the new `role` field to be read by its owner, unchanged otherwise), `terraform/` seed shape only if it should write `role` explicitly (the legacy fallback keeps existing environments working).
- Deployment: touches the Next.js app and the functions component; both redeploy via their existing component hashes. No Terraform data protections change. `CLAUDE.md`, `docs/DEPLOYMENT.md` and the README need updating.
