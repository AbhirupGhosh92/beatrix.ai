# Tasks

## 1. Menu config and feature gate

- [x] 1.1 Change `nav.drawerItems` from `string[]` to objects (`id`, `label`, `href`, `icon`, `enabled`) in `src/data/profile.ts` and `profile.example.json`; verify `npm run typecheck` passes
- [x] 1.2 Make `getProfile()` read legacy string items as disabled and treat a missing `enabled` as false; verify with a stored profile in the old shape that the page still renders and shows no new link
- [ ] 1.3 Render only enabled items in `DrawerMenu.tsx`, with the icon and `href`, and hide items whose route the role cannot use; verify in the browser as reader, base and admin in both themes
- [ ] 1.4 Add `FEATURE_ROUTES` and the `/resume-builder` and `/api/resumes` (`features:basic`) entries to `src/lib/access.ts` (`/api/admin/resumes` stays under `/api/admin`, `cms:write`, and is not flag-gated); apply the flag check (404, closed when the profile is unavailable) in `src/proxy.ts`; verify requests return 404 when disabled, 403/redirect for a reader, and pass for a base user when enabled
- [x] 1.5 Update the `access-control` and `profile-content` notes in `CLAUDE.md` for the structured nav and the feature gate; verify the text matches the code
- [ ] 1.6 Add `src/lib/drawer.ts` (`visibleDrawerItems`, `hasDrawerContent`), use it in `DrawerMenu` and `app/page.tsx`, and pass `showMenu` to `Navbar` so the menu button and the drawer are not rendered when nothing would be listed; verify with `npm run typecheck`/`lint` and the helper's results for reader, base and admin with items on and off, then a browser check

## 2. Resume config

- [x] 2.1 Define the resume config type and `resume-config.example.json` (templates, `limits.baseMaxResumes: 3`, `defaultStructure`, `structureRules`); verify `npm run typecheck` passes
- [x] 2.2 Add the `getResumeConfig` private function and `src/middleware/resumeConfigService.ts` (cache ~30s, example fallback, missing-key fill, invalid templates skipped); verify an edited config in the CMS changes the builder without a rebuild
- [x] 2.3 Add the shared validation module (structure and data checks, field types, limits) for the app and mirror it in `functions/`; verify the same sample inputs give the same result in both
- [x] 2.4 Always list `resume-config.json` in the admin file list (functions `cms.ts`) and open it pre-filled with the default config, unsaved, when it does not exist yet (`/admin/cms`); verify with the fake-storage harness that the list includes it before it exists, and a render/DOM check that the editor content is the default and dirty

## 3. Storage, ownership and caps

- [ ] 3.1 Add the resumes bucket (versioning, 30-day noncurrent rule, `force_destroy = false`, `prevent_destroy`) and IAM for the App Hosting compute account in `terraform/`, with outputs; verify `npm run infra:check` and `terraform plan` succeed
- [x] 3.2 Add a plan guard test that a delete/replace of the resumes bucket is blocked (extend `scripts/deploy/` tests); verify the test fails without the guard and passes with it
- [ ] 3.3 Implement the resume functions (list, get, create, save, delete) with `privateEndpoint()`, ID-token verification, owner from the token, hashed owner prefix, transactional cap on `resume_owners/{email}` and generation precondition on save; verify with the emulator or a deployed dev project that another user's id returns 404, parallel creates stop at the cap and a stale save returns 409
- [x] 3.4 Add `src/middleware/resumeService.ts` and the `/api/resumes` route handlers using the shared helpers; verify the browser only ever calls the Next.js routes
- [x] 3.5 Confirm the resume functions are covered by the existing `functions` component hash in `scripts/deploy/components.sh` (no new component needed); verify with `components.sh hash functions` that the hash changes when a resume function changes and not on a docs-only change

## 4. Builder page and form

- [ ] 4.1 Create `src/app/resume-builder/` with a resume list (cap shown for base users, create/delete) as functional client components; verify the list, the create-at-cap message and delete in the browser
- [ ] 4.2 Build the structure-driven form with placeholders only, live field validation and a disabled Generate button until valid; verify an untouched form lists the missing fields and cannot generate
- [ ] 4.3 Implement save modes: explicit Save with unsaved-changes warning for base users, debounced autosave with 409 handling for advanced users; verify both in the browser, including two tabs
- [ ] 4.4 Add the structure editor for advanced users with `structureRules` validation and clear error messages; verify a valid change updates the form and an invalid one is rejected
- [ ] 4.5 Run `npm run typecheck`, `npm run lint` and `npm run build`; verify all pass and the layout works from 320px to 1920px in both themes

## 5. Export

- [x] 5.1 Build the document model and the Markdown renderer; verify a sample resume produces the expected `.md`
- [ ] 5.2 Add the template tokens, layout ids and the template picker (only enabled, valid templates); verify a disabled template is hidden and an invalid one is skipped without breaking the page
- [x] 5.3 Add the DOCX renderer with heading/paragraph styles, Word-safe fonts, no layout tables; verify the file opens in Word or LibreOffice with selectable text and converts to PDF with the same content and structure
- [x] 5.4 Add the PDF renderer with embedded standard fonts and the layouts; verify the PDF matches each template's style and contains no watermark
- [x] 5.5 Load both libraries with dynamic imports; verify they are absent from the landing page bundle in the `npm run build` output and that one Generate click produces exactly one file
- [x] 5.6 Add `sampleData(structure)` and `TemplatePreview` (real PDF renderer, sample data, "open preview" fallback) to the template picker; verify the sample PDF renders for each template and for a custom structure, that no resume content reaches it, and a browser check that switching templates updates the preview

## 6. Retention and admin cleanup

- [ ] 6.1 Add `adminListResumeOwners` and `adminPurgeResumeOwner` (orphan-only, typed email, all versions removed, audit entry) and the `/api/admin/resumes` routes; verify that an active owner is refused, a wrong email deletes nothing and a valid purge removes all object versions
- [ ] 6.2 Add the Access-area admin view for orphaned data (email, count, size, updated only) with the typed-confirmation delete; verify no resume text appears in the list or network responses
- [ ] 6.3 Verify revoke keeps data and restore returns it unchanged; verify a user delete stays recoverable for 30 days via the bucket's noncurrent versions
- [ ] 6.4 Document the operator restore procedure and the new bucket, functions, component and protections in `docs/DEPLOYMENT.md`; verify the commands run as written

## 7. Integration and docs

- [ ] 7.1 Walk through the scenarios in the three new/changed specs as reader, base, advanced and admin; verify each result and note what was not run
- [ ] 7.2 Update docs: `CLAUDE.md` (resume builder, resume config, storage and retention sections), `docs/DEPLOYMENT.md` and the README; verify `scripts/update-readme.mjs` leaves no diff and `openspec validate --all` passes

## Workflow follow-up

- Issue #75 and branch `feature/75-resume-builder` exist.
- Review the proposal with the user before implementing.
- Run `/opsx:archive` before the PR is ready.
