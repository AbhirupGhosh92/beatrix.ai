# Proposal

Fixes #75 (branch `feature/75-resume-builder`).

## Why

Signed-in users have nothing to do on the site beyond viewing it, although the role model already reserves `features:basic` and `features:advanced`. A resume builder is the first feature for those roles: a structured, validated form that produces a resume in several styles and formats, stored privately per user.

## What Changes

- New **Resume builder** page, reachable from the drawer menu for users holding `features:basic` (`user-base` and above).
- A structured form driven by a structure file (`resume_structure.json`) with placeholder text, full validation, drafts that always save, and explicit save for base users or autosave for advanced users.
- Browser-side export of one resume in one template and one format (PDF, DOCX or MD) per generation. DOCX is built from real Word styles so it converts cleanly to PDF. There is no watermark.
- Templates are config driven: a closed vocabulary of style tokens plus a code-defined layout id, each template with its own `enabled` flag.
- Limits by role: a base user holds at most 3 resumes and uses the default structure; an advanced user has no cap and can edit a structure file per resume (validated against a meta-schema).
- Per-user storage in a new private resumes bucket, keyed by the Google email. A user can reach only their own resumes; admins cannot read resume content. User deletes and overwrites are recoverable for 30 days.
- Revoking a user keeps their data. Admins get a list of owners whose access is gone but whose data remains (email, count, size only) and can hard delete that data (every object version, no recovery).
- Menu items become structured config entries with an `enabled` flag. The flag is enforced on the server: a disabled item's page and API return 404.
- A separate resume-builder config file (templates, limits, default structure, meta-schema limits) loaded the same way as the profile; the main profile keeps only home page and menu content.
- **BREAKING**: `nav.drawerItems` changes from `string[]` to an array of objects. `profile.example.json` and `src/data/profile.ts` change together, and the stored profile is migrated on first deploy (the old string form is read as `{label}` items that stay disabled, so nothing new appears unexpectedly).

Out of scope: server-side rendering, watermarks, admin access to resume content, a restore UI (restores are an operator action), multi-user sharing, resume import, email-change migration (a new Google email is a new user), AI features.

## Capabilities

### New Capabilities
- `resume-builder`: the page, structure-driven form and validation, drafts, role-based limits, templates and browser-side export, plus per-user private storage and isolation.
- `resume-data-retention`: the 30-day recovery window, the orphaned-data list for admins and admin hard delete.

### Modified Capabilities
- `access-control`: a route's availability can also depend on a feature flag in config (404 when disabled), and `/resume-builder` plus `/api/resumes` require `features:basic`.
- `profile-content`: menu items are structured entries with an `enabled` flag instead of plain strings.
- `deployment-pipeline`: the resumes bucket is a protected resource, and the new functions and config are separate deploy components.

## Impact

- **Code**: `src/lib/access.ts` (route permission, feature gate), `src/proxy.ts`, `src/data/profile.ts` and `profile.example.json` (nav items), `DrawerMenu.tsx`, a new `src/app/resume-builder/` page and `src/app/api/resumes/` plus `src/app/api/admin/resumes/` routes, new services in `src/middleware/`, a new export module (client-only) with a PDF library and a DOCX library loaded on demand.
- **Backend**: new private functions (resume list/get/save/delete, `getResumeConfig`, admin orphan list and purge) in `functions/`, a Firestore collection for the per-owner index, and the same ID-token verification as the admin functions.
- **Infrastructure**: a new versioned resumes bucket with a 30-day noncurrent-version rule, added to `PROTECTED_TYPES` with a test; IAM for the App Hosting service account on that bucket; `storage.rules` unchanged (all client access stays denied).
- **Dependencies**: a PDF library and a DOCX library (client bundle, dynamically imported).
- **Docs**: `CLAUDE.md`, `docs/DEPLOYMENT.md` and the README.
