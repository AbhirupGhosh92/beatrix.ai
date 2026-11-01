## Context

- Today `ResumeEditor.tsx` owns one `doc` state (`title`, `data`, `structure`), saves it explicitly (base) or by autosave 1.5s after the last edit (advanced), and quotes the stored `generation` so a stale tab gets a 409. `TemplatePreview` already draws the real PDF renderer output from `withSampleFallback(structure, doc.data)` with a 500ms debounce. These stay the source of truth; the workspace is a new shell around them.
- `resume-config.example.json` defines the default structure, in which `summary` is a single, non-repeatable section. Base users cannot edit structure, and the structure and data validators are mirrored byte-for-byte between `src/lib/resumeValidation.ts` and `functions/src/resumeValidation.ts`.
- `ai_backend/` (renamed from `python/`) is hello-world FastAPI. The deploy tooling still points at `python/`: `scripts/deploy/components.sh` hashes it and `scripts/deploy-backend.sh` runs `gcloud run deploy --source python`, so after the rename a change to `ai_backend/` would never deploy and a forced deploy would fail.
- The site reaches private services only from the Next.js server with a Google ID token (`src/middleware/cloudFunctions.ts`). Cloud Run needs the same, with the service URL as audience.

## Goals / Non-Goals

**Goals:**
- One `doc` state remains the only copy of the resume; canvas, score and AI actions all derive from it.
- Reordering and summary variants work for base users without loosening the structure lock.
- The AI seam is real (route, middleware, auth, error handling, UI) so swapping stubs for models later touches only `ai_backend/app/`.

**Non-Goals:**
- Real model calls, prompts, LangChain code, or storing AI inputs.
- Comments or any sharing of resumes (future Notes capability).
- New roles, permissions, caps or privacy rules.

## Decisions

**1. View settings live beside the structure, not in it.** Resumes gain an optional `view` object (`sectionOrder: string[]`, `activeVariants: Record<sectionId, number>`). The server validates `sectionOrder` is a permutation of the effective structure's section ids and each active index is within range, and ignores nothing else. Alternative: reorder by rewriting the structure; rejected because base users may not save a structure and the lock requirement says so. Collapsed/expanded state stays in the browser (per-viewer convenience, `localStorage` in try/catch), not stored.

**1b. The header section stays first.** The structure's first section (name and contact line) is the document header, so it is not movable and the order only applies to the sections after it. The preview canvas is always shown, because the download format is chosen in the header and no longer switches the preview off for Markdown; the page says that a Markdown file has no styling.

**2. Summary variants reuse `repeatable`.** The default structure's `summary` becomes a repeatable section, and `activeVariants.summary` names the one exported. `reconcileData` (and the server's load path) wraps an old single-object summary into a one-entry list, so existing resumes open unchanged. `model.ts` exports only the active entry for sections flagged as variant sections, which is a new optional section attribute (`variants: true`) validated by the structure rules. Alternative: a separate `summaries` key outside the structure; rejected as it bypasses structure-driven forms and validation. The tracker's tailor JSON validator accepts both the old object and the list form.

**3. Workspace layout is composition, not new state.** `ResumeEditor` keeps data and save logic and renders `WorkspaceHeader`, `ContentPanel`, `AiPanel`, `DesignPanel`, `PreviewCanvas` (the existing `TemplatePreview` promoted and enlarged) and `QuickActions`. Below `lg` the three columns become a tab switcher (Content / Preview / Actions). Download calls the existing `exportResume` unchanged.

**4. Score is a pure function in `src/lib/resume/score.ts`.** `scoreResume(structure, data): { score, reasons[] }` with a small table of weighted rules (required and common sections filled, summary length, bullets per entry, bullet length, digits or percentages in bullets, dates present). It reads real data only (never `withSampleFallback`), runs in the browser and is not sent anywhere. The `/score` stub exists for a later AI-judged score, and the UI keeps the rules-based score until that is wired in.

**5. AI calls: browser, Next route, middleware, Cloud Run.** New `src/app/api/ai/[action]/route.ts` (actions `tailor`, `skill-match`) checks the session and `features:basic` through the existing proxy rules (`/api/ai` added to `ROUTE_PERMISSIONS` as `features:basic` and to `FEATURE_ROUTES` under `resume-builder`), validates body size and shape, and calls `src/middleware/aiService.ts` (`import 'server-only'`). That service mints a Google ID token with audience equal to the Cloud Run URL, reusing the token-cache approach in `cloudFunctions.ts`, applies a timeout and maps failures to a 502 with a plain message. The service URL comes from `AI_BACKEND_URL`; unset or unreachable means the AI panel shows "unavailable" and nothing else is affected. Alternative: call Cloud Run from a Cloud Function; rejected as an extra hop with no benefit for stateless calls.

**6. The `python` component id and Cloud Run names stay.** Only the source path changes (`ai_backend`). Renaming the component id would orphan the GCS deploy markers and the workflow's component list, and renaming the service or the `python-ai-runtime` service account would be a destroy/replace that the plan guard correctly blocks. The component hash changes with the path, so the first run after merge redeploys the service once, which is expected.

**7. JSON editing goes through `components/ui/JsonEditor`.** `StructureEditor` and the tracker's tailor field render `JsonEditor` (Monaco, code and tree views) and keep their existing validation. The component is loaded with `next/dynamic` (`ssr: false`) so the builder and tracker pages do not pay for Monaco until the editor is shown. If it lacks a needed prop (height, label), it is extended in place, not copied.

## Risks / Trade-offs

- [Summary shape change breaks old data or the tailor validator] -> load-time normalisation in both the client `reconcileData` and the server, tailor validator accepts both shapes, scenarios cover an old resume and an old tailor JSON.
- [Mirrored validators drift] -> edit `src/lib/resumeValidation.ts` and `functions/src/resumeValidation.ts` together and run `diff` (must be empty).
- [Monaco weight and CDN loading] -> dynamic import, only rendered when the structure editor or tailor field is opened.
- [Resume text sent to a Cloud Run service] -> private IAM-only service, no storage or logging of content in `ai_backend`, nothing sent unless the user presses an AI action. Real models later will need a separate data-handling review.
- [Stub results mistaken for real advice] -> `stub: true` is carried to the UI and always labelled.
- [Large UI refactor of `ResumeEditor`] -> keep state and save logic in place, extract presentational components first, check the existing flows in both themes at 320px to 1920px.

## Migration Plan

1. Land the deploy-path fix first (it is independent): after merge, `dev` redeploys the Python service once because its hash changed; confirm `GET /health` through the site's service account.
2. Ship the workspace and the `view` field together. No data migration: resumes without `view` use the structure's order, and old summaries are wrapped on load, written back on the next save.
3. Rollback: revert the PR. Resumes saved with `view` or a list-form summary remain valid JSON; the old editor would ignore `view` and the server's old validator would reject a list-form summary on save, so roll back only before users save list-form summaries, or keep the load-time normaliser in a follow-up hotfix.

## Open Questions

- How `AI_BACKEND_URL` reaches each App Hosting environment (a per-environment value from a Terraform output versus a computed `run.app` URL). It is configuration only; the code reads the variable and degrades when it is unset.
- Exact score rule weights; they are one table in `score.ts` and can be tuned without changing the spec.
