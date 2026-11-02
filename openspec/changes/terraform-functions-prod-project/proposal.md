# Proposal

Fixes #92 (replaces the earlier issue #80, which was closed). The last group (Terraform stops seeding personal emails) is tracked in #94.

Builds on #79 (PR #81), which is merged; this change is refreshed against `main` after the resume workspace (#90 / PR #91), the job tracker functions and the `ai_backend/` Python service landed, and revised again for the two-pipeline, three-stage model below.

## Why

Cloud Functions are deployed with the Firebase CLI and tracked by hash markers, so the Terraform plan, the plan guard and the prod approver never see them. The security rules are worse: `google_firebaserules_release` already manages them in Terraform **and** the pipeline also deploys them with the Firebase CLI, so two tools own the same live resource. `terraform/environments/prod.tfvars` points at `beatrix-ai-prod`, but the real prod project is `asterion-453905`. And `release.yml` publishes the GitHub release when a release branch is pushed, before any deploy has succeeded. Prod also deploys only from a release branch that someone has to create first, and there is one shared pipeline entry (`deploy.yml`) for both environments, which hides that dev and prod do different things.

## What Changes

- **BREAKING (process): two pipelines, three stages.** `dev` and `prod` get one pipeline each, `deploy-dev.yml` and `deploy-prod.yml`, which call the shared stage logic in `deploy-environment.yml`. Everything is applied by Terraform and GitHub Actions.
  - Stage 1, Firebase configuration: the existing `terraform/` configuration (APIs, Firestore, Storage, security rules, Auth and IAM, the App Hosting backend resource).
  - Stage 2, Cloud Functions: the new `terraform/functions/` configuration (the Node functions) and then the Python AI service (`gcloud run deploy`, only when `ai_backend/` changed).
  - Stage 3: on dev, the App Hosting rollout (Firebase CLI, only when the app changed); on prod, cut the release.
  A stage starts only after the previous one succeeded.
- **BREAKING (process): two Terraform configurations with separate state.** Each stage has its own saved plan, plan guard and apply of that saved plan. No workflow uses `terraform -target`. The functions bucket, source object, the 23 `google_cloudfunctions2_function` resources and the invoker bindings live in `terraform/functions/` (same state bucket, backend prefix `terraform/functions`). The resources already applied on dev into the stage-1 state move declaratively with `removed` blocks (`destroy = false`) and `import` blocks, never by hand.
- Every Cloud Function exported by `functions/src/index.ts` (23 at the time of writing, including the job tracker's) is a Terraform resource (same names, runtime `nodejs22`, 256Mi, 60s, max 5 instances, `us-central1`, as deployed today). The source zip is named by a content hash, so unchanged code produces no diff and no new revision. Each function is invokable only by `firebase-app-hosting-compute@<project>` (authoritative IAM binding).
- Existing dev functions are adopted in place with `import` blocks. A plan that would replace or delete a function stops the run for review.
- **BREAKING (process):** the Firebase CLI no longer deploys functions or rules. The only Firebase CLI deploy left is App Hosting on dev. The Python service (`python` component, `ai_backend/`) stays a `gcloud` deploy in stage 2.
- **BREAKING (process): prod deploys a commit on `main`, then cuts the release.** Prod takes `ref` (default `main`, must be reachable from `main`) and a required `version` (`X.Y` or `X.Y.Z`) instead of requiring an existing `release/*` branch or tag. It never deploys App Hosting; the rollout stays manual in the Firebase console. After stages 1 and 2 and the smoke test succeed, the pipeline creates the branch `release/<version>` at the deployed commit, the tag `v<version>` and the GitHub release (notes from `RELEASE_NOTES.md` at that commit, marked Latest). Verify fails early when the notes file is missing or empty, or when `release/<version>` or the tag already exists at a different commit. Re-running for the same commit and version updates the release. Pushing a release branch publishes nothing.
- **Terraform stops filling in people's data (#94).** It creates the infrastructure only. The resources driven by personal email lists, the seeded `allowed_emails/<email>` admin documents and the developer `serviceAccountTokenCreator` bindings, are no longer managed: `allowed_admin_emails`, `developer_members` and the placeholder emails in the tfvars are removed, and `removed` blocks (`destroy = false`) leave what already exists untouched. `scripts/add-admin.sh <env> <email>` adds an admin; after a deploy, and at the end of `recreate-environment.sh`, a non-blocking notice says when no admin exists and how to add one. The GitHub-variable workaround for the emails (`email-vars.sh`) is removed.
- The prod project becomes `asterion-453905` (`prod.tfvars`, docs; skills read it from the file).
- `scripts/deploy-functions-dev.sh` plans and applies the whole `terraform/functions` configuration on dev only (no `-target`), with the plan guard, and refuses any other project.
- A check keeps the Terraform function list equal to the exports of `functions/src/index.ts`; the decision table has one row per stage.

Out of scope: automating the prod App Hosting rollout or the GitHub connection of the prod backend (App Hosting rollouts and Cloud Run source deploys cannot be Terraform resources, so they stay CLI steps inside Actions); provisioning the `asterion-453905` project itself (billing, Storage, sign-in are manual steps run through `recreate-environment.sh prod`); changing any function's behavior or code; moving CMS or resume data; per-function source packages.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment-pipeline`: two pipelines (dev, prod) with three ordered stages; the two Terraform configurations and the declarative move between them; functions and rules owned by Terraform and covered by plans and plan guards; adoption by import; prod deploys a commit on `main` with a `version`, never deploys App Hosting, and approves once after both plans; prod targets `asterion-453905`; a dev-only functions script; the "unchanged components" and resume-function requirements reworded accordingly.
- `release-notes`: a successful prod run cuts the release (branch, tag, GitHub release) instead of a branch push publishing it.

## Impact

- `terraform/` (function resources move out; `removed` blocks), new `terraform/functions/` (providers, backend, variables, `functions.tf`, outputs, per-environment tfvars), `terraform/environments/prod.tfvars`.
- `functions/package.json`/`firebase.json` (predeploy removed), `functions/src/index.ts` (read-only: export list is checked).
- `scripts/deploy/components.sh`, `scripts/deploy-backend.sh`, `scripts/check-scripts.sh`, `scripts/build-functions.sh`, `scripts/check-functions.sh`, `scripts/deploy-functions-dev.sh`, `scripts/recreate-environment.sh`, `scripts/deploy/plan_guard.py` and its tests.
- `.github/workflows/deploy.yml` (replaced by `deploy-dev.yml` and `deploy-prod.yml`), `deploy-environment.yml`, `release.yml`, `infra-check.yml`, `ci.yml`.
- `.claude/skills/dev-deploy`, `prod-deploy`, `.claude/rules/environments.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/DEPLOYMENT.md`, `terraform/README.md`, `openspec/specs/deployment-pipeline`, `openspec/specs/release-notes`.
- `scripts/add-admin.sh`, `scripts/deploy/check-data.sh`, `scripts/seed-data.sh`, `scripts/recreate-environment.sh`, `scripts/sync-github-env.sh`, removal of `scripts/deploy/email-vars.sh`, `terraform/variables.tf`, `terraform/environments/*.tfvars` and `terraform/terraform.tfvars.example`.
- One-time effect on dev: the `removed` blocks make stage 1 forget the function resources it holds (nothing is destroyed), and stage 2 adopts them and the 22 CLI-deployed functions in place.
