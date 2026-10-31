# Proposal

Fixes #82 (branch `feature/82-job-application-tracker`).

## Why

Users build resumes in the resume builder but have nowhere to record which jobs they applied to, what stage each is at, or which resume went with it. Tailoring a resume per job is manual. A tracker that links an application to a tailored resume closes that gap and is the first step toward AI-tailored resumes later.

## What Changes

- New **Job tracker** page for users holding `features:basic`, reachable from the drawer menu while its own menu item (`job-tracker`) is enabled.
- Users add, edit and delete applications. An application has a company, a role, a link to the direct job posting that opens in a new tab, a status, an applied date, notes, labels, an optional tailor JSON and an optional link to a tailored resume.
- The list is a table with a notes column, free-text labels (several per application, with suggestions from the user's own labels), and search, sorting and filtering by status and labels.
- A quick navigation button in each top bar: the tracker links to the resume builder and the builder links back, each shown only while the other feature is enabled.
- Statuses come from a fixed set in the resume config (Saved, Applied, Interview, Offer, Rejected, Withdrawn), with a fallback so a config typo never breaks the page.
- The tailor JSON has the same shape as a resume builder resume's data object. A button on an application creates a new resume from it in the resume builder and links the two. Invalid JSON is rejected with the reasons; a partial one is accepted as a draft, as for any resume.
- A base user holds at most 3 applications; roles with `features:advanced` have no cap (only a safety limit of 500). The tailored resume is an ordinary resume and also counts against the existing resume cap (3 for base users, none for roles with `features:advanced`), so a base user chooses which applications get one and deleting a tailored resume frees the slot.
- Applications and tailor JSON are stored privately per user in Firestore, keyed by the verified email. Another user's id is a 404.
- The orphaned-data list and the admin hard delete cover applications as well as resumes.
- `nav.drawerItems` gains a disabled `job-tracker` entry in `profile.example.json` (no breaking change; the structured item format already exists).

Out of scope: AI or LangChain generation of the tailor JSON, fetching or parsing the job description from its link, reminders and notifications, a rich editor for the tailor JSON (pasting JSON is enough), one-click tailoring for several applications, import and export of applications.

## Capabilities

### New Capabilities
- `job-application-tracker`: the page, application records and statuses, per-user private storage and isolation, the tailor JSON and its ingestion into a linked resume, and how the resume cap applies.

### Modified Capabilities
- `access-control`: `/job-tracker` and `/api/applications` require `features:basic` and exist only while the `job-tracker` menu item is enabled.
- `resume-data-retention`: the orphaned-data list and the admin hard delete also cover a revoked owner's applications, and a revoked user keeps their applications.

## Impact

- **Code**: `src/lib/access.ts` (route permission and feature flag), `src/data/profile.example.json`, a new `src/app/job-tracker/` page, `src/app/api/applications/` routes, a new service in `src/middleware/`, new components in `src/components/jobs/`, and the resume config (`resumeConfig.ts`, its example and sanitiser) for statuses and limits.
- **Backend**: new private functions in `functions/` (list, create, update, delete, create-resume-from-tailor-JSON) and a shared resume-creation path extracted from `resumeCreate` so the cap transaction is not duplicated; the admin list and purge functions learn about applications. Validation code in `src/lib/resumeValidation.ts` is reused unchanged and stays byte-for-byte equal to its `functions/` mirror.
- **Infrastructure**: none. A new Firestore collection falls under the existing default-deny `firestore.rules`, and the Cloud Functions deploy with the existing functions component hash.
- **Docs**: `CLAUDE.md`, `docs/DEPLOYMENT.md` (function list), README structure section.
