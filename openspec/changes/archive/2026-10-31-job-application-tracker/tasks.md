# Tasks

## 1. Config and shared resume creation

- [x] 1.1 Add a `tracker` block (`statuses` as `{ id, label }`, `baseMaxApplications`, `maxApplications`, `maxNotesLength`, `maxLabels`, `maxLabelLength`, `maxTailorBytes`) to `src/data/resumeConfig.ts` and `resume-config.example.json`, and make `sanitizeResumeConfig` fall back to the example's block when it is invalid; verify `npm run typecheck` passes and a config with an empty `statuses` list loads the default statuses.
- [x] 1.2 Extract the body of `resumeCreate` in `functions/src/resumes.ts` into an exported `createResumeFor(email, role, config, input)` that keeps the cap transaction and object write unchanged, and make `resumeCreate` call it; verify `pnpm --prefix functions build` passes and, in the emulator or dev, the builder still creates, hits the cap of 3 and refuses the fourth.
- [x] 1.3 Document the new config block and the extraction in the file's own comments and in `CLAUDE.md`'s resume builder config paragraph; verify the paragraph matches the code.

## 2. Backend functions

- [x] 2.1 Add `functions/src/applications.ts` with `applicationList`, `applicationCreate`, `applicationUpdate`, `applicationDelete` working only under `application_owners/{email}/applications/{id}`, validating fields, status, job link (http/https), labels (trimmed, de-duplicated, within limits) and tailor JSON with `checkDraft`, and enforcing `maxApplications` in a transaction on `application_owners/{email}.count`; verify `pnpm --prefix functions build` passes and a missing company, bad link, unknown status and invalid tailor JSON each return 400.
- [x] 2.2 Make `applicationList` report `resumeId` as null (and clear the stored link) when the linked resume no longer exists in the owner's prefix; verify by deleting a linked resume and listing again.
- [x] 2.3 Add `applicationCreateResume`: require a tailor JSON, open the existing resume when the link is live, otherwise call `createResumeFor` (title from company and role) and store `resumeId`; verify a base user with 3 resumes gets 409 and an advanced user does not, and two parallel calls with 2 resumes create exactly one.
- [x] 2.4 Export the new functions from `functions/src/index.ts`; verify the function names appear in the build output.
- [x] 2.5 Extend `adminListResumeOwners` and `adminPurgeResumeOwner` in `functions/src/resumeAdmin.ts` to include and delete `application_owners`, and record the application count in `resume_audit`; verify an owner with only applications is listed with `applications` > 0 and `count` 0, and no row field contains application text.

- [x] 2.6 Enforce the base-user cap: add `tracker.baseMaxApplications` (default 3) to the config type, example, sanitiser and `readLimits`; check the caller's cap in the `applicationCreate` transaction (base: `baseMaxApplications`, advanced: the safety limit) and return `cap` from `applicationList`; verify against the emulators that a fourth application for a base user gets 409, two parallel adds at 2 of 3 create exactly one, deleting frees a slot, an advanced user adds a fourth and a downgraded user cannot add.

## 3. Server layer

- [x] 3.1 Add `src/middleware/applicationService.ts` forwarding the `__session` cookie and the tracker limits and the resume config's limits and rules to the new functions, plus `src/lib/applicationTypes.ts`; verify `npm run typecheck` passes.
- [x] 3.2 Add `src/app/api/applications/route.ts`, `[id]/route.ts` and `[id]/resume/route.ts` as thin handlers with `featureOff('job-tracker')`, forwarding only whitelisted fields; verify with the dev server that a request with another owner's id returns 404 and an owner field in the body is ignored.
- [x] 3.3 Add `/job-tracker` and `/api/applications` to `ROUTE_PERMISSIONS` (`features:basic`) and `FEATURE_ROUTES` (`job-tracker`) in `src/lib/access.ts`, and a disabled `job-tracker` entry to `profile.example.json`; verify a `reader` gets a redirect or 403, a base user gets the page while enabled, and every role gets 404 while disabled.
- [x] 3.4 Mirror the access-control scenarios in the access-control capability notes in `CLAUDE.md`'s access paragraph; verify the text lists the new routes.

## 4. Job tracker page

- [x] 4.1 Add `src/app/job-tracker/page.tsx` and `src/components/jobs/` (a table with company, role, status, applied date, labels and notes columns, newest applied date first, with a search box, sortable column headings, status and label filters combined with AND, a match count, a job posting link that opens in a new tab with `rel="noopener noreferrer"`, application form, status select, tailor JSON textarea with inline errors); verify `npm run lint` and `npm run build` pass and add, edit and delete work in the browser, and search, sort and filters each narrow the list and combine.
- [x] 4.1a Add a label input to the application form with duplicate removal and suggestions from the user's existing labels; verify "Remote" and "remote" collapse to one label and the limit message appears.
- [x] 4.2 Add the Create tailored resume button (open the linked resume when it exists, show the cap message on 409 and disable it with no tailor JSON); verify in the browser that the new resume appears in `/resume-builder` with the tailor content and that deleting it makes the button return.
- [x] 4.3 Check the page from 320px to 1920px in both themes, using only semantic classes from `src/styles/` and `text-brand*` for text; verify no horizontal scroll and readable contrast.

- [x] 4.4 Add the quick navigation buttons: `switchTo` on `ResumeNav`, passed from the tracker and builder layouts (shown only while the other item is enabled, icon-only below `sm`); verify in a browser that each button appears and navigates when the other item is enabled, is absent when it is disabled, and fits at 320px without horizontal scroll.

- [x] 4.5 Show the cap in the tracker: "n of 3 used" for base users, a disabled Add application button with the delete-one message at the cap, and the server's 409 message if it still arrives; verify in a browser at 3 of 3 and below, in both themes at 320px and 1440px.

## 5. Admin and final checks

- [x] 5.1 Show the application count in the orphaned data table in `/admin/access`; verify a revoked user with applications appears with the count and the purge removes them.
- [x] 5.2 Update docs: `CLAUDE.md` (state of the project and resume builder sections), `docs/DEPLOYMENT.md` (function list under the functions component), and the README structure section via `scripts/update-readme.mjs`; verify `git diff` shows the new functions and routes listed.
- [ ] 5.3 Run `npm run check`, `npm run build` and `openspec validate --all`, then walk the spec scenarios in a browser as a base user, an advanced user and a reader; verify and record the results in the PR's Verification section.

## Workflow follow-up

- Archive the change with `/opsx:archive` before the PR is ready, and commit the merged specs.
- The six skill files updated by `openspec update` stay out of this change's commits.
