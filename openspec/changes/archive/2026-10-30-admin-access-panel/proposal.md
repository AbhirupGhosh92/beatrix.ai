# Proposal

Fixes #73

## Why

Onboarded users are the `allowed_emails/{email}` Firestore docs, but only Terraform and `scripts/seed-data.sh` can write them. Admins cannot see, add, revoke or change the role of users at runtime, and a user who signs in for the first time with no doc is simply denied. Access control should be managed from `/admin`, not Terraform or the console. The role hierarchy and server-verified sessions already exist (`access-control`); this change adds the management surface and first-sign-in registration on top of them.

## What Changes

- `/admin` gets a top navbar with two entries, **CMS** and **Access**. The existing editor moves to `/admin/cms`; `/admin` redirects there.
- New **Access** page (`/admin/access`): list users, add a user by email, revoke or restore access, and change a user's role (`reader`, `user-base`, `user-advanced`, `admin`).
- A user who signs in for the first time with a verified email and no `allowed_emails/{email}` doc is registered as a `reader` as part of that sign-in and gets a session straight away. An existing doc is never overwritten; revoked users stay revoked. This replaces the "no entry means no access" rule for verified sign-ins.
- New private Cloud Functions `adminListUsers` and `adminSetUser`, reached only through a new Next.js server route; both require the `cms:write` permission.
- Guards: an admin cannot revoke or demote themselves, and the last active admin cannot be removed.
- Terraform is not changed.

## Capabilities

### New Capabilities
- `user-access`: first-sign-in registration and how admins manage users' role and access.

### Modified Capabilities
- `access-control`: the sign-in requirement now registers an unknown verified email as a `reader` instead of refusing it.
- `admin-cms`: `/admin` is organised under a top navbar with the CMS editor as one section.

## Impact

- `functions/src/` (`session.ts`, new `users.ts`, `index.ts`), `src/middleware/`, `src/app/api/admin/users/`, `src/app/admin/`, plus docs. No new client sign-in code: the existing session sign-in does the registration.
- Deploy: the `functions` component hash changes, so the normal pipeline ships it; no Terraform, Firestore rules or Storage changes. The branch is merged with `main` so the deployed `sessionCreate` and `sessionVerify` functions stay in source and nothing is deleted.

**Out of scope:** hard-deleting users, an audit log, invite or approval requests, Terraform changes, new roles or permissions, email notifications.
