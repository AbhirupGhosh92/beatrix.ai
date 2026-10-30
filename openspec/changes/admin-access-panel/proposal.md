# Proposal

Fixes #73

## Why

Onboarded users are the `allowed_emails/{email}` Firestore docs, but only Terraform and `scripts/seed-data.sh` can write them. Admins cannot see, add, revoke or promote users at runtime, and a user who signs in for the first time with no doc is simply denied. Access control should be managed from `/admin`, not Terraform or the console.

## What Changes

- `/admin` gets a top navbar with two entries, **CMS** and **Access**. The existing editor moves to `/admin/cms`; `/admin` redirects there.
- New **Access** page (`/admin/access`): list users, add a user by email, revoke or restore access, change a user's role (`reader` / `admin`).
- First successful Google sign-in registers the user: if no `allowed_emails/{email}` doc exists, one is created with `role: "reader"` and `allowed: true`. An existing doc is never overwritten; only `lastLoginAt` is updated.
- New private Cloud Functions for registration, listing and updating users, reached only through new Next.js server routes (the browser never calls a function).
- Admin check accepts `role == "admin"` or the legacy `admin == true`, so Terraform-seeded docs keep working. Terraform is not changed.
- Guards: an admin cannot revoke or demote themselves, and the last admin cannot be removed.

## Capabilities

### New Capabilities
- `user-access`: how users are registered on first sign-in and how admins manage their role and access.

### Modified Capabilities
- `admin-cms`: admin eligibility also accepts `role: "admin"`, and `/admin` is organised under a top navbar with the CMS editor as one section.

## Impact

- `functions/src/` (`auth.ts`, new users module, `index.ts`), `src/middleware/`, `src/app/api/admin/`, `src/app/admin/`, `src/lib/firebase.ts` and the sign-in flow, plus docs.
- Deploy: the `functions` component hash changes, so the normal pipeline ships it; no Terraform, Firestore rules or Storage changes.

**Out of scope:** hard-deleting users, an audit log, invite or approval requests, Terraform changes, permissions beyond reader/admin, email notifications.
