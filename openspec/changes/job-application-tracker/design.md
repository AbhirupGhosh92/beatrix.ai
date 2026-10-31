# Design

## Context

The resume builder already provides what the tracker needs: server-verified owner (`requireSession`), a private Cloud Function per operation, a resume cap enforced in a Firestore transaction on `resume_owners/{email}`, draft validation (`checkDraft`) against a structure, a resume config with fallbacks (`sanitizeResumeConfig`), a menu flag enforced in `src/proxy.ts`, and an orphaned-data list and purge. The tracker reuses these instead of adding parallel mechanisms. `firestore.rules` already denies all client access, so a new collection needs no rules change. See proposal.md for scope.

## Goals / Non-Goals

**Goals:**
- A tailored resume is a normal resume: same bucket, same cap, same editor and export.
- One cap, one transaction. No second counter.
- Applications stay small, queryable and private per user.

**Non-Goals:**
- AI generation of the tailor JSON (a later change will fill the same field).
- Resume content search, sharing, reminders, import and export.

## Decisions

**Applications live in Firestore, not Storage.** Path `application_owners/{email}/applications/{id}`. They are small structured records the page filters and sorts by status and date, so documents fit better than one Storage object each; the resume bucket stays for resume content. The owner is the verified email taken from the session in the function, never a request field, so another user's id is a 404 because the path does not exist for the caller. A per-owner subcollection also makes the admin purge a simple delete of one subtree. Alternative: JSON objects in the resumes bucket (rejected: no query, a list call reads every object, and 30-day versioning would apply to rows that are cheap to recreate).

**Tailor JSON is stored on the application document**, capped by the same size limits as resume data (`checkDraft` plus a byte cap from config). The field is shaped as the default structure's `ResumeData`, so the later AI step writes exactly what ingestion reads. Validation reuses `src/lib/resumeValidation.ts` unchanged (mirrored byte-for-byte in `functions/`). Tailor JSON is validated against the default structure for every role. Alternative: validate against the source resume's structure (rejected for now: needs a source-resume choice, which is out of scope; advanced users with a custom structure can still edit the resume after creation).

**Create-tailored-resume is one function, not two browser calls.** `applicationCreateResume` loads the application, checks it has a tailor JSON and no live linked resume, then calls a shared `createResumeFor(email, role, config, { title, structure, data })` extracted from `resumeCreate`. The extraction moves the existing cap transaction and object write verbatim, so the cap and the parallel-create guarantee are the same code path as the builder, with no duplicated counting. The link (`resumeId`) is then written to the application. If that last write fails the resume exists unlinked; the action is idempotent in effect (the user can link by retrying and, at worst, deletes one extra resume). Alternative: have the browser call `/api/resumes` then `/api/applications` (rejected: two round trips, and a client could create resumes without linking or link to an id it does not own).

**The link is validated lazily.** `resumeDelete` does not know about applications. When the application list is read, the handler lists the owner's resume ids (one prefix listing, which `resumeList` already does) and reports `resumeId` as null when the linked resume is gone, clearing the stored link on that read. Alternative: have `resumeDelete` scan applications (rejected: couples the two features and adds a query to every delete).

**Statuses and limits live in the resume config.** A `tracker` block (`statuses`, `maxApplications`, `maxNotesLength`, `maxTailorBytes`) is added to `resume-config.json`, its example, and `sanitizeResumeConfig`, which already replaces invalid blocks with the example's. The config is cached ~30s by `getResumeConfig` and lists in `/admin/cms` already. A separate tracker config file would add a second cache, loader and CMS entry for four values. The statuses are `{ id, label }` pairs so a label can change without rewriting stored ids; the stored value is the id.

**Safety limit, not a cap.** Applications are unlimited for every role in the product sense, but a per-owner count in `application_owners/{email}` (`count`, updated in the same transaction as the create) enforces `maxApplications` (default 500) so one account cannot grow without bound, and the limit holds under parallel creates the same way the resume cap does. Delete decrements it.

**Labels, search, sort and filter run in the browser.** Labels are a normalised array on the application (trimmed, lowercased for comparison, de-duplicated; limits `maxLabels` and `maxLabelLength` in the config's `tracker` block and enforced in the function). The page loads the owner's applications once (bounded by `maxApplications`), so search over company, role, notes and labels, column sorting, and status and label filters are plain array operations with no server query or index, and the label suggestions are the distinct labels of that same list. Selected labels combine with AND. Alternative: Firestore queries with `array-contains` (rejected: it allows one label at a time, no substring search, and needs composite indexes).

**Job posting link.** The stored `jobUrl` is accepted only as an `http:` or `https:` URL (checked in the function, so a `javascript:` URL can never be stored) and rendered as an anchor with `target="_blank"` and `rel="noopener noreferrer"`. The page does not fetch it.

**Quick navigation.** `ResumeNav` (the top bar both pages share) takes a `switchTo` prop (`itemId`, `label`, `href`, `icon`) and renders a link button only while `isFeatureEnabled(profile.nav.drawerItems, itemId)` holds, reading the profile with `useProfile()`. The route permission is not checked in the browser: both routes need the same `features:basic`, so anyone on one page may open the other, and the server still decides. The label is hidden below `sm` so the icon-only button fits at 320px.

**Routing and flag.** `ROUTE_PERMISSIONS` gets `/job-tracker` and `/api/applications` at `features:basic`; `FEATURE_ROUTES` ties both to the `job-tracker` menu item; `profile.example.json` gains a disabled `job-tracker` entry. API route handlers check `featureOff('job-tracker')` like the resume routes. The page is `src/app/job-tracker/page.tsx`, components in `src/components/jobs/` (list with status filter, application form, tailor JSON textarea, create-resume button), client components using `fetch` to `/api/applications`.

**Admin cleanup.** `adminListResumeOwners` currently queries `resume_owners` with `count > 0`. It is extended to also read `application_owners` docs with `count > 0` and merge by email, returning `applications` next to `count`/`bytes`. `adminPurgeResumeOwner` additionally deletes the `application_owners/{email}` subtree (batched, `recursiveDelete`) and records the number of applications in the existing `resume_audit` entry. No application content is read.

**Deploy.** The new functions live in `functions/`, so the existing `functions` component hash covers them; nothing new is added to `scripts/deploy/components.sh`, `terraform/` or `firestore.rules`.

## Risks / Trade-offs

- [Resume created but link write fails] → The action is retried safely; worst case is one unlinked resume the user can delete. The cap message stays accurate because the resume count is real.
- [Tailor JSON validated against the default structure only] → Documented; advanced users edit the resume afterwards. A later change can pick a source structure.
- [Lazy link clearing writes on read] → One small write only when a linked resume is gone; reads stay correct either way because the response already reports null.
- [Refactoring `resumeCreate` can regress the builder] → The extraction is mechanical and verified by re-running the builder scenarios (create, cap, parallel create) before the new code is added.
- [Applications are personal data without versioning] → A user delete is final. This is acceptable for cheap-to-recreate rows and is stated in the spec; revoke keeps the data.
- [`resume_audit` already logs only resume purge] → The same entry now also records the applications deleted, so the audit stays one record per purge.

## Open Questions

- Whether a later change should let a user pick which resume's structure the tailor JSON targets. Deferrable: the stored field is the same either way.
