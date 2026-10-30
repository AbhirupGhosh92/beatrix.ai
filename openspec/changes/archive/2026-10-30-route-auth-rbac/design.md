# Design

## Context

Auth is client-only today (`src/app/page.tsx` `onAuthStateChanged`, `UpcomingProjects.tsx` popup sign-in, allow-list read from the browser via `isEmailAllowed`). The only server enforcement is `functions/src/auth.ts` `requireAdmin`, reached through `/api/admin/cms` with a bearer token. The Next server has no session and no request proxy; `src/middleware/` holds server-only services and must not be confused with Next's own middleware file (Next 16 calls it `proxy.ts`). `maxInstances: 1`, so request-time Firestore reads are cheap. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Server-enforced, default-deny route gating with an `httpOnly` session cookie.
- One policy module for roles, permissions and routes, shared by proxy, API, functions and UI.
- Role and revocation changes apply to the very next request.

**Non-Goals:**
- A role-management UI, the future features themselves, other sign-in providers, or rate limiting.
- Changing how Cloud Functions are called from Next (still private functions, Google ID token for the App Hosting service account).

## Decisions

1. **Firebase session cookie, minted by a private Cloud Function.** `POST /api/auth/session` takes the browser's fresh ID token and forwards it to the private function `sessionCreate`, which verifies it, checks the allow-list and returns a cookie value made with the Admin SDK's `createSessionCookie` (about 5 days). The Next route sets it `httpOnly`, `Secure` outside dev, `SameSite=Lax`, `Path=/`. `DELETE` clears it. Alternative: a self-signed JWT. Rejected: it duplicates what Firebase already verifies and cannot be revoked via `revokeRefreshTokens`.
2. **`firebase-admin` stays in `functions/` only (decided).** The Next server never imports it. Verification goes through private functions called with `callCloudFunction`, like every other backend call, so the "browser -> Next server -> private functions -> Firebase" architecture and the existing IAM boundary are unchanged. Functions: `sessionCreate` (ID token -> cookie value), `sessionVerify` (cookie -> `{ email, role }`, or 401, re-reading `allowed_emails` every call). Alternative: bundle `firebase-admin` into the Next server. Rejected by the project owner.
3. **`src/proxy.ts` is the coarse gate, not the only gate.** It runs on the Node runtime, calls `sessionVerify` with the cookie (which checks revocation and re-reads the role), then matches the path against the policy's route table. Route handlers and Cloud Functions repeat the permission check next to the data (`requirePermission`). The extra function hop per protected request is accepted; the Google ID token minted for the call is cached until shortly before it expires. Alternative: only the proxy. Rejected: proxy matchers are easy to misconfigure and API/functions callers must not trust it.
4. **Default-deny by inverting the table.** The policy lists *public* paths (`/`, `/_next/*`, static files, `/api/auth/*`); everything else requires login, and a longest-prefix map names stricter permissions (`/admin` and `/api/admin` need `cms:write`). A new route is protected unless someone adds it to the public list.
5. **Roles as an ordered list, permissions as sets.** `ROLES = [reader, user-base, user-advanced, admin]`; each role's permissions are the union of the role below plus its own (`site:view`; `features:basic`; `features:advanced`; `cms:write` and everything). `can(role, permission)` is a pure function importable from server and client code (no server-only imports in the policy file).
6. **Role storage and resolution.** `allowed_emails/{email}.role`, with the resolution order: `allowed === false` -> anonymous; valid `role` -> that role; `admin === true` -> `admin`; otherwise `reader`. Unknown values fall back to `reader` (fail low). Existing Terraform/seed documents keep working unchanged.
7. **Immediate role changes.** No role is stored in the cookie; it is read per request. An optional in-memory cache of a few seconds can be added later; the spec requires the next request, so the default is no cache.
8. **Client UI.** The browser still signs in with Firebase, then calls `POST /api/auth/session`; sign-out calls `DELETE` and Firebase `signOut`. The page receives the role from a server-provided source (for example a `GET /api/auth/me`, or props from a server layout) and uses `can()` only to hide controls.
9. **CSRF.** `SameSite=Lax` plus the session endpoint requiring a fresh ID token in the body, and state-changing API routes accepting only JSON `POST` with the bearer/ID token already used today.

## Risks / Trade-offs

- Every protected request costs a function call plus a Firestore read (and a cold start with `minInstances: 0`) -> acceptable at `maxInstances: 1` traffic; cache the service ID token; add a short role cache only if latency becomes a problem (it would weaken "immediate").
- Protected routes are unusable if `sessionVerify` is unreachable -> the gate fails closed (denies); `/` stays public so the landing page still works.
- Lockout (a bug rejects admins) -> keep the legacy `admin: true` fallback and test the seeded admin in each environment; the Cloud Function permission check stays independent of the proxy.
- Cookie vs. Firebase token lifetime mismatch -> `verifySessionCookie(..., true)` checks revocation; document `revokeRefreshTokens` as the emergency lever.
- Local development: the server gate does NOT inherit `isEmailAllowed`'s "allow everyone when Firebase is not configured" behaviour, nor the `demo-api-key` shortcut in `UpcomingProjects.tsx` (both client-side). With no reachable functions the gate denies; developers use the existing `FUNCTIONS_CALLER_SERVICE_ACCOUNT` setup against the real `dev` project. No bypass flag is added (assumption recorded here; revisit only if it blocks development).
- Deploy order: the new proxy needs `sessionVerify` to exist, so the `functions` component must be live before App Hosting serves the new proxy (confirm the pipeline's order in `docs/DEPLOYMENT.md` and document it).

## Migration Plan

1. Land the policy module, the `sessionCreate`/`sessionVerify` functions, the session endpoints and role resolution (no gate yet).
2. Switch the client sign-in to create the session; verify admin works end to end in `dev`.
3. Enable `proxy.ts`; verify scenarios in `dev`, then `staging`; `prod` only by the manual release.
4. Rollback: remove `proxy.ts` (routes become open again, the Cloud Function checks still protect data).
