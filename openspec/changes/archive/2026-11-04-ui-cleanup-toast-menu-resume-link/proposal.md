# Proposal

## Why

Three rough edges in the shipped UI: snackbars appear with a fade but vanish abruptly (and the stack jumps), the account menu (the "..." dropdown with Profile, Settings and Log out) has no configured destination so Profile and Settings do nothing when clicked, and the job tracker never shows which resume an application is linked to even though the link is already stored and returned.

Fixes #103.

## What Changes

- Snackbars animate out as well as in: an exit fade/rise before removal, and the remaining snackbars slide into place instead of snapping. Under reduced motion nothing animates, as today.
- Account menu entries become structured profile config like the drawer's: each has an `id`, `label`, `icon`, `enabled` flag and an action (`link` to an internal path or external URL, or `sign-out`). The menu renders only enabled entries the role may use. Profiles stored in the old `{ label, icon }` shape still load: a `log-out` entry stays an enabled sign-out, Profile and Settings are read as disabled (they do nothing today). The example profile ships Profile and Settings disabled, because no such pages exist yet.
- The job tracker table gets a "Resume" column showing the title of the linked resume as a link to `/resume-builder?open=<id>`; the cell is empty when the application has no (live) linked resume.
- `applicationList` returns `resumeTitle` next to `resumeId`, taken from the resume object metadata it already lists for the stale-link check (no extra storage read).

Out of scope: building Profile or Settings pages; changing how tailored resumes are created or linked; showing the resume title in the application form; searching or sorting by resume; undo/pause-on-hover for snackbars.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `api-feedback`: snackbars animate in and out and the stack reflows smoothly.
- `profile-content`: account menu entries are configured in the profile (action, enabled flag, legacy fallback).
- `job-application-tracker`: the table shows the linked resume's title, blank when unlinked.

## Impact

- `src/components/ui/SnackbarHost.tsx`, `src/styles/components/snackbar.css`.
- `src/data/profile.ts`, `src/data/profile.example.json`, `src/middleware/profileService.ts` (normalizer), `src/components/layout/NavbarDropdown.tsx`, a small helper beside `src/lib/drawer.ts`.
- `functions/src/applications.ts`, `src/lib/applicationTypes.ts`, `src/components/jobs/ApplicationTable.tsx`. Changing `functions/` goes out through the stage 2 deploy (the Cloud Functions are Terraform resources); no data migration, no Terraform change.
- Docs: `CLAUDE.md` (snackbars, dropdown config, tracker), `docs/DEPLOYMENT.md` only if the pipeline changes (it does not).
