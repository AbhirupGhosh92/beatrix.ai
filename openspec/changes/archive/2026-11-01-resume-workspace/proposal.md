## Why

The resume builder is a single form column with a small preview tucked into the Generate panel, so users edit blind, cannot reorder sections and get no help tailoring a resume to a job. A workspace-style editor (large live canvas, side panel, quick actions) fixes that, and the AI-backed actions need a seam to the Python service (now `ai_backend/`) so real models can be added later without reworking the UI. Fixes #90.

## What Changes

- Replace the builder's editor screen with a workspace: a large live preview canvas, a header (breadcrumb, inline rename, download split button for PDF/DOCX/MD, sync-state icon), a left panel with Content / AI / Design tabs (the template gallery lives in Design), and a right quick-actions rail (Resume Score). Skill Match and Tailor for Job live in the AI tab only.
- Content tab: sections become collapsible and reorderable. Order is a per-resume view setting, separate from the structure, so base users can reorder while the structure lock stays.
- Summary can hold several variants; one is marked active and is the only one exported.
- Resume Score is computed in the browser from fixed, documented rules. Skill Match and Tailor for Job call the AI service.
- `ai_backend/` gets stub endpoints (`/tailor`, `/score`, `/skill-match`) that return fixed, clearly marked (`stub: true`) results. The Next.js server calls them through a new `src/middleware/` service using the existing Google ID-token pattern; the browser never calls them. Real models are added later.
- Every JSON editor uses the shared CMS `JsonEditor` (Monaco): the resume structure editor and the job tracker's tailor JSON replace their plain textareas, and the shared editor gains a full screen view that all of them get.
- Fix the `python/` to `ai_backend/` rename in the deploy scripts, Terraform comments, docs and README (the pipeline currently hashes and deploys a folder that no longer exists).
- The release version button is shown on the home page only, no longer on every page.
- Out of scope: undo/redo, comments (a future Notes capability), real model calls, sharing resumes, any change to roles, caps, privacy or validation rules.

## Capabilities

### New Capabilities

None. Everything extends existing capabilities.

### Modified Capabilities

- `resume-builder`: workspace layout, collapsible and reorderable sections, summary variants, score, skill match, tailor for job, templates gallery in the Design tab, AI actions through the server, JSON editing with the shared editor.
- `job-application-tracker`: the tailor JSON field is edited with the shared JSON editor.
- `python-ai-service`: stub AI routes, the `ai_backend/` folder name, callable only from the site's server.
- `deployment-pipeline`: the Python component's source hash and deploy source are `ai_backend/`.
- `release-notes`: the version button appears on the home page only.
- `admin-cms`: the shared JSON editor has a full screen view (used by the CMS, the structure editor and the tailor JSON).

## Impact

- Code: `src/components/resume/` (editor split into canvas, header, panels, rail), `src/lib/resume/` (score, view), `src/lib/resumeValidation.ts` and its mirror `functions/src/resumeValidation.ts`, `functions/src/resumes.ts` (view setting), `src/components/jobs/ApplicationForm.tsx`, `src/components/ui/JsonEditor.tsx`, new `src/middleware/aiService.ts` and `src/app/api/ai/*`, `src/lib/access.ts`, `ai_backend/app/`.
- Pipeline: `scripts/deploy/components.sh`, `scripts/deploy-backend.sh`, `terraform/main.tf` comments, `docs/DEPLOYMENT.md`.
- Data: resumes gain an optional view setting (section order); existing resumes load unchanged.
- Docs: `CLAUDE.md`, `ai_backend/README.md`, README.
