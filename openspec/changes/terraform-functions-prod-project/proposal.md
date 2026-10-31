# Proposal

Fixes #80

Builds on #79 (PR #81): this branch is stacked on `feature/79-remove-staging-split-deploys` and is rebased onto `main` once that merges.

## Why

Cloud Functions are deployed with the Firebase CLI and tracked by hash markers, so the Terraform plan, the plan guard and the prod approver never see them. The security rules are worse: `google_firebaserules_release` already manages them in Terraform **and** the pipeline also deploys them with the Firebase CLI, so two tools own the same live resource. `terraform/environments/prod.tfvars` points at `beatrix-ai-prod`, but the real prod project is `asterion-453905`. And `release.yml` publishes the GitHub release when a release branch is pushed, before any deploy has succeeded.

## What Changes

- **BREAKING (process):** the 17 Cloud Functions become Terraform resources in both environments (`google_cloudfunctions2_function`, one per exported function, same names, runtime `nodejs22`, 256Mi, 60s, max 5 instances, `us-central1`, as deployed today). The source zip is named by a content hash, so unchanged code produces no Terraform diff and no new revision. Each function is invokable only by `firebase-app-hosting-compute@<project>` (authoritative IAM binding, no public access).
- Existing dev functions are adopted in place with committed Terraform `import` blocks. A plan that would replace or delete a function stops the run for review.
- **BREAKING (process):** the Firebase CLI no longer deploys functions or rules. The `functions` and `rules` components, their hash markers and their `firebase.json` predeploy are removed. The only CLI component left is `apphosting`, for dev. Prod never deploys a component with the CLI: prod is one reviewed `terraform apply`, and the App Hosting rollout is created by hand in the Firebase console from the release branch.
- The prod project becomes `asterion-453905` (`prod.tfvars`, docs, skills read it from the file).
- The GitHub release (`vX.Y.Z` and its notes from `RELEASE_NOTES.md`) is created or updated by a job that runs only after a successful prod deploy and smoke test. The branch-push trigger of `release.yml` is removed.
- New `scripts/deploy-functions-dev.sh` deploys the function resources alone on dev with `terraform plan`/`apply -target` and the plan guard. It refuses any other environment. Manual deploys of prod stay available only through the guarded workflow.
- A check keeps the Terraform function list equal to the exports of `functions/src/index.ts`.
- The decision table shows functions and rules as parts of the Terraform plan; the plan job builds the functions before planning.

Out of scope: automating the prod App Hosting rollout or the GitHub connection of the prod backend; provisioning the `asterion-453905` project itself (billing, Storage, sign-in are manual steps run through `recreate-environment.sh prod`); changing any function's behavior or code; moving CMS or resume data.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment-pipeline`: functions and rules are owned by Terraform and covered by the plan and plan guard; the Firebase CLI deploys only App Hosting on dev and nothing on prod; adoption of existing functions is by import and never replaces silently; prod targets `asterion-453905`; a dev-only functions script exists and refuses prod; the "unchanged components" and resume-function requirements are reworded accordingly.
- `release-notes`: the GitHub release is created or updated by a successful prod deploy instead of a branch push.

## Impact

- `terraform/` (new function resources, source bucket, invoker bindings, import blocks, outputs, variables), `terraform/environments/prod.tfvars`.
- `functions/package.json`/`firebase.json` (predeploy removed), `functions/src/index.ts` (read-only: export list is checked).
- `scripts/deploy/components.sh`, `scripts/deploy-backend.sh`, `scripts/check-scripts.sh`, new `scripts/deploy-functions-dev.sh`, new function-list check, `scripts/deploy/plan_guard.py` and its tests.
- `.github/workflows/deploy-environment.yml`, `deploy.yml`, `release.yml`, `infra-check.yml`, `ci.yml`.
- `.claude/skills/dev-deploy`, `prod-deploy`, `.claude/rules/environments.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/DEPLOYMENT.md`, `terraform/README.md`, `openspec/specs/deployment-pipeline`, `openspec/specs/release-notes`.
- One-time effect on dev: the first apply adopts 17 functions in place (labels and source move from the CLI's to Terraform's), and the Firebase-CLI-built source objects in `gcf-v2-sources-*` are no longer used.
