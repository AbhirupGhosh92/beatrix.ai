## 1. Fix the ai_backend rename in the pipeline

- [x] 1.1 Point `scripts/deploy/components.sh` (`python` hash) and `scripts/deploy-backend.sh` (`--source`) at `ai_backend`, keeping the component id `python`; verify `scripts/check-scripts.sh` passes and `grep -rn "source python\|hash_paths python" scripts` is empty
- [x] 1.2 Update `terraform/main.tf` comments, `ai_backend/README.md` (title, `cd ai_backend`), `docs/DEPLOYMENT.md` and the Python section of `CLAUDE.md`; verify `grep -rn "python/" docs CLAUDE.md README.md terraform ai_backend scripts .github` shows no source-path references
- [x] 1.3 Confirm `ai_backend/*.egg-info` is not tracked (add it to `.gitignore` if needed); verify `git ls-files ai_backend` lists only source files
- [x] 1.4 Run `npm run infra:check`; verify it passes and the plan guard still lists no deletes

## 2. Stub AI endpoints in ai_backend

- [x] 2.1 Add `POST /tailor`, `/score` and `/skill-match` under `ai_backend/app/` with pydantic input models and fixed, deterministic results containing `stub: true`, no logging of bodies; verify with local `uvicorn` and `curl` for 200 results and a 422 on a malformed body
- [x] 2.2 Keep `/health`, `/hello` and `/ws` unchanged; verify `curl localhost:8080/health` still returns 200 with no `MODEL_API_KEY`
- [x] 2.3 Document the three routes and their stub status in `ai_backend/README.md`; verify the documented `curl` examples run as written

## 3. Server seam to the AI service

- [x] 3.1 Add `src/middleware/aiService.ts` (`server-only`): ID-token auth for the Cloud Run audience with the token-reuse pattern, timeout, size limit, 502 mapping, reads `AI_BACKEND_URL`; verify `npm run typecheck` and that importing it from a client component fails the build
- [x] 3.2 Add `src/app/api/ai/[action]/route.ts` (`tailor`, `skill-match`) using the shared route helpers, with `/api/ai` added to `ROUTE_PERMISSIONS` (`features:basic`) and `FEATURE_ROUTES` (`resume-builder`) in `src/lib/access.ts`; verify with a dev server that a reader gets 403, a disabled menu item gets 404, and a valid call returns the stub result
- [x] 3.3 Make an unset or unreachable `AI_BACKEND_URL` return a clear error instead of throwing; verify by calling the route with the variable unset
- [x] 3.4 Add the `AI_BACKEND_URL` setup note (per environment, from the Terraform output or the Cloud Run URL) to `docs/DEPLOYMENT.md` and `terraform/README.md`; verify the documented steps match `terraform output`

## 4. Resume data: view setting and summary variants

- [x] 4.1 Add the optional `view` object and the section `variants` attribute to `src/lib/resumeValidation.ts`, mirror it in `functions/src/resumeValidation.ts`; verify `diff` of the two files is empty and `npm run functions:build` passes
- [x] 4.2 Store and return `view` in `functions/src/resumes.ts` and `src/lib/resumeTypes.ts`, validating `sectionOrder` as a permutation of the effective structure's ids and active indexes in range; verify a bad order is a 400 and nothing is stored
- [x] 4.3 Make `summary` a repeatable variants section in `src/data/resume-config.example.json` and normalise an old single-object summary in `reconcileData` and on the server load path; verify an old resume opens with its summary as one active variant
- [x] 4.4 Make `model.ts` export only the active variant, and make the tracker's tailor validator and tailored-resume creation accept both summary shapes; verify a PDF, DOCX and Markdown export contain only the active summary and an old tailor JSON still saves
- [x] 4.5 Update the `view` and summary notes in the Resume builder section of `CLAUDE.md`; verify the text matches the code

## 5. Workspace editor

- [x] 5.1 Extract `WorkspaceHeader` (breadcrumb, inline rename, sync icon, download split button using `exportResume`); verify rename saves per role and each format downloads one file, with an invalid resume refused
- [x] 5.2 Build `ContentPanel` with collapsible sections (browser-only state) and drag plus keyboard reorder writing `view.sectionOrder`, and summary variant add, remove and set-active; verify a base user reorders and the order drives preview and exports
- [x] 5.3 Promote `TemplatePreview` to `PreviewCanvas` (large, follows `view.sectionOrder`) and keep the debounce and "open preview" fallback; verify typing updates the canvas within about a second
- [x] 5.4 Build `QuickActions` (the score only; no skill match, tailor or templates) and the Design tab's template gallery; verify choosing a template redraws the canvas and the next download uses it
- [x] 5.5 Make the layout responsive (three columns at `lg`, switchable panels below); verify at 320, 768 and 1920px in both themes with no horizontal page scroll
- [x] 5.6 Remove the superseded Generate sidebar code; verify `npm run lint` and `npm run build` pass with no unused files or imports

## 6. Score, skill match and tailor in the UI

- [x] 6.1 Add `src/lib/resume/score.ts` with the weighted rule table, reading real data only; verify an empty resume scores low with reasons, filling a flagged section raises the score, and sample text is not counted
- [x] 6.2 Show the score and reasons in the rail (and the score in the AI tab); verify they update without a reload
- [x] 6.3 Build the AI tab: job description input (with "use from application" from the tracker), Skill Match result, Tailor suggestion review and Apply as an undoable edit, all labelled as placeholders while `stub` is true; verify apply then undo restores the previous content
- [x] 6.4 Handle AI errors and the unavailable state without affecting the rest of the workspace; verify by unsetting `AI_BACKEND_URL`

## 7. Shared JSON editor everywhere

- [x] 7.1 Replace the structure textarea in `StructureEditor.tsx` with `JsonEditor` (dynamic import, `ssr: false`), keeping apply, reset and error list; verify valid and invalid structures behave as before
- [x] 7.2 Replace the tailor textarea in `ApplicationForm.tsx` with `JsonEditor`, keeping the loading and disabled states; verify create, edit and the invalid-JSON rejection
- [x] 7.3 Extend `JsonEditor` in place if it needs height or label props; verify `grep -rn "<textarea" src | grep -i json` returns nothing and the CMS editor is unchanged
- [x] 7.4 Add a full screen view to the shared `JsonEditor` (portal to `body`, Escape and button to leave, page scroll locked, no form submit); verify in the CMS editor, the structure editor and the tailor JSON that it fills the window, keeps edits and exits cleanly

## 8. Version button on the home page only

- [x] 8.1 Make `ReleaseNotes` render only at `/` (it stays in the root layout, which wraps every page); verify the home page HTML contains the version button and, once signed in, that `/resume-builder` and `/job-tracker` do not show it

## 9. Integration checks and docs

- [x] 9.1 Run `npm run check` and `npm run build`; verify both pass
- [ ] 9.2 Manual browser check in both themes: open, edit, reorder, rename, change template, download PDF/DOCX/MD, run both AI actions, as a base user and as an advanced user; verify each against the spec scenarios and record results in the PR Verification
- [ ] 9.3 Verify RBAC and privacy unchanged: reader redirected/403, another user's id is 404, base cap and structure lock intact; verify with the dev server and two accounts
- [x] 9.4 Update docs: `CLAUDE.md` (workspace, view setting, AI seam, JSON editor rule), `docs/DEPLOYMENT.md`, `README.md` project structure (`node scripts/update-readme.mjs`); verify the pre-push hook reports no README diff
- [x] 9.5 Run `openspec validate --all`; verify it passes

## Workflow follow-up

- Archive the change with `/opsx:archive` before the PR is ready, then commit the archived result.
- Open the PR with the standard sections and `Fixes #90`; list only the checks actually run under Verification.
