# Design

## Context

See proposal.md for why. Observed today (dev project `beatrix-ai-dev`, read-only):

- 17 gen2 functions were observed deployed by the Firebase CLI on dev when this was first written; `functions/src/index.ts` now exports 23 (the job tracker added `applicationList`, `applicationGet`, `applicationCreate`, `applicationUpdate`, `applicationDelete`, `applicationCreateResume`), and all 23 are deployed on dev. The settings are the same for all of them: `us-central1`, `nodejs22`, `256Mi`, `60s`, max 5 instances, concurrency 80, 1 CPU, ingress `ALLOW_ALL`, default compute service account, labels `deployment-tool=cli-firebase` and `firebase-functions-hash`. Entry points are the camelCase export names (`getProfile`); the Cloud Run services are lowercase (`getprofile`). Environment: `FIREBASE_CONFIG` (`{"projectId","storageBucket"}`), `GCLOUD_PROJECT`, `LOG_EXECUTION_ID`, plus platform-set `FUNCTION_TARGET`/`FUNCTION_SIGNATURE_TYPE`. Each service has exactly one invoker, `firebase-app-hosting-compute@<project>`.
- `terraform/main.tf` owns the rules (`google_firebaserules_ruleset`/`release`), the APIs (`cloudfunctions`, `cloudbuild`, `run`, `artifactregistry`) and the App Hosting service account. The deployer service account already holds `cloudfunctions.admin`, `run.admin`, `storage.admin`, `artifactregistry.admin`, `iam.serviceAccountUser`.
- The first iteration of this change put the function resources in `terraform/functions.tf` (same root and state as everything else) and applied the `status` function, the source bucket, its source object and its binding to dev that way. That state is why the move in decision 9 exists.
- Prod today: `deploy.yml` starts both environments; prod requires an existing `release/*` branch or `vX.Y.Z` tag; the GitHub `prod` environment does not exist yet. A release `v1.2.1` exists, created by `release.yml` on branch push.
- `dev.tfvars` holds placeholder admin emails that differ from dev's real state, so a plain stage-1 plan on dev proposes deleting the real admin document and the guard blocks it. That is outside this change and is reported to the owner.

## Goals / Non-Goals

**Goals:**
- Two pipelines, one per environment, each with three ordered stages; everything applied by Terraform and GitHub Actions.
- Each stage is a separate reviewed, guarded, saved plan; a failed stage stops the later ones.
- Functions and rules change only through a reviewed plan; identical code gives no diff and no new revision.
- Existing dev functions are adopted in place; nothing is silently replaced or destroyed during the move between Terraform states.
- Prod deploys a commit on `main` and cuts the release only after everything succeeded.

**Non-Goals:**
- Changing function code, memory, timeout, region, runtime or service account.
- Automating the prod App Hosting rollout or provisioning `asterion-453905`.
- Per-function source packages (any change under `functions/` updates every function).
- Managing the Python service or the App Hosting rollout as Terraform resources.

## Decisions

**1. One `google_cloudfunctions2_function` per export, from an explicit list.** `terraform/functions/functions.tf` holds `local.function_names` (every export; 23 today) and a `for_each` resource whose settings reproduce the deployed values above, so adoption is an in-place update. Env vars set: `FIREBASE_CONFIG`, `GCLOUD_PROJECT`, `LOG_EXECUTION_ID`; the platform sets the rest from `entry_point`. The default compute service account is kept. Alternative: derive the list from the built `lib/index.js` — rejected because a reviewer could not see in the plan which functions exist. `scripts/check-functions.sh` compares the list with the exports of `functions/src/index.ts` and runs in `check-scripts.sh`, so CI, Verify and `infra-check` all enforce it.

**2. Deterministic source, named by content hash, saved with the stage-2 plan.** `scripts/build-functions.sh` stages `lib/`, `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` into `terraform/functions/.build/functions-src` with fixed file times; `archive_file` zips it and the object is `functions/<output_md5>.zip` in the Terraform-managed bucket `<project>-functions-src` (uniform access, public access prevention, no expiry rule: an expired object would make unchanged functions show a diff, and the zips are small). A saved plan reads the zip from disk at apply time, so the stage-2 plan job saves the zip next to `tfplan` and the stage-2 apply job downloads both; Apply never rebuilds. All functions share one zip, so any change under `functions/` updates every function in place; this is accepted (one codebase with shared modules).

**3. Authoritative invoker binding.** `google_cloud_run_v2_service_iam_binding` per function with role `roles/run.invoker` and members only `firebase-app-hosting-compute@<project>.iam.gserviceaccount.com` (derived from the project id, because stage 2 does not see stage 1's resources). A hand-added invoker shows up as a removal in the next plan.

**4. Adoption by `import` blocks behind a variable.** In stage 2, `import { for_each = var.adopt_existing_functions ? local.functions : toset([]) ... id = projects/<p>/locations/<r>/functions/<Name> }`, and the same variable imports the already-existing source bucket. `terraform/functions/environments/dev.tfvars` sets it to true until the first full apply; prod leaves it false (an import of a missing function would fail). The expected first dev plan for N deployed functions: N imports, N in-place updates, N binding sets, the bucket imported, 1 source object, no replace. Compare `local.function_names` with `gcloud functions list` before the first plan.

**5. Plan guard protects functions in both stages.** `google_cloudfunctions2_function` is in `PROTECTED_TYPES` with a unit test; a delete or replace fails the run unless `allow_destructive`. A function removed from the source and the list becomes a delete in the stage-2 plan.

**6. Two pipelines, shared stage logic.** `deploy-dev.yml` (push to `main`, plus a manual run for dev) and `deploy-prod.yml` (`workflow_dispatch` only; inputs `ref`, `version`, `confirm`, `allow_destructive`, `redeploy_all`) both call the reusable `deploy-environment.yml`, which holds the jobs once: policy, gate, verify, plan stage 1, plan stage 2, approve (prod), apply stage 1, apply stage 2, the Python service, stage 3 and the smoke test. The components outside Terraform are `apphosting` (dev only) and `python`, each with its hash marker. The prod caller then calls `release.yml` for the cut. Two entry files make it explicit that the pipelines differ; the shared file keeps one definition of each stage.

**7. Two Terraform configurations, because a saved plan cannot be applied in parts.** `terraform apply tfplan` applies the whole plan, and `-target` with a saved plan is not possible, so separate reviewed stages need separate configurations. Stage 1 is `terraform/` (backend prefix `terraform/state`, unchanged); stage 2 is `terraform/functions/` (backend prefix `terraform/functions`, same per-environment bucket). Stage 2 takes `project_id`, `region`, `environment` and `adopt_existing_functions` from `terraform/functions/environments/<env>.tfvars`; `check-scripts.sh` verifies its `project_id` equals the one in `terraform/environments/<env>.tfvars`. It assumes stage 1 enabled the APIs, so stage 2 is never planned before stage 1 exists (the gate covers this) and `scripts/recreate-environment.sh` applies stage 1, builds the functions, then applies stage 2. No workflow uses `-target`.

**8. Stage order and one prod approval.** Both plans are made and guarded first; for prod, the `prod-release` reviewers approve once, seeing both plans and the decision table, and nothing is applied before that. Then stage 1 applies, then stage 2 (functions, then the Python service when `ai_backend/` changed), then stage 3. Each later job `needs` the earlier one, so a failure stops the rest. Stage 2's plan is made before stage 1 applies, which is safe because stage 2 does not read stage 1's resources; Terraform refuses a stale saved plan.

**9. Declarative move of the first-iteration resources.** `terraform/` gets `removed { from = ... lifecycle { destroy = false } }` blocks for `google_cloudfunctions2_function.fn`, `google_cloud_run_v2_service_iam_binding.function_invoker`, `google_storage_bucket_object.functions` and `google_storage_bucket.functions_src`, so stage 1 forgets them without destroying anything (a no-op on environments whose state never had them, such as prod). Stage 2 adopts the bucket and the functions by import and creates the new hash-named object and the bindings (an authoritative binding with the same members is idempotent). The previous source object stays in the bucket as an unused file. No manual `terraform state` command is used. Because stage 1 applies before stage 2, a resource is never held by both states at apply time.

**10. Prod deploys a commit on `main` and then cuts the release.** `ref` defaults to `main` and must be reachable from `main` (Verify checks `git merge-base --is-ancestor`). `version` is required (`X.Y` or `X.Y.Z`), together with `confirm=prod`. Verify fails before any plan when `RELEASE_NOTES.md` is missing or empty, or when `release/<version>` or the tag `v<version>` already exists at a different commit. After stages 1 and 2 and the smoke test succeed, `release.yml` (called by `deploy-prod.yml`, with `contents: write` granted by the caller so no dev job ever has it) creates `release/<version>` at the deployed commit, the tag and the GitHub release marked Latest with the notes from that commit; re-running for the same commit and version updates the release. Pushing a release branch publishes nothing. Prod never deploys App Hosting; the rollout stays manual from the Firebase console. Alternative: keep deploying from an existing release branch — rejected by the owner.

**11. Dev functions script applies the whole stage-2 configuration.** `scripts/deploy-functions-dev.sh` reads `project_id` from the dev tfvars, refuses any other project, builds, plans `terraform/functions` (no `-target`), runs the plan guard, asks for confirmation (or `--yes`) and applies the saved plan. Alternative: Firebase CLI — rejected: it would drift against state.

**12. Prod project.** `prod.tfvars` `project_id = "asterion-453905"`; docs and skills read it from the file. The state bucket, workload identity condition and GitHub variables derive from the project and environment name.

**13. The Python AI service is part of stage 2 but not a Terraform resource.** `ai_backend/` (Cloud Run `beatrix-ai`, component `python`) is deployed with `gcloud run deploy --source` after the functions apply, only when its hash changed, on dev and on prod, under the same approval. Its runtime account, secret and invoker rule stay in stage 1. Alternative: a `google_cloud_run_v2_service` resource — rejected because building an image from source is a separate change.

**Assumptions recorded for the owner to correct:** prod commits must be on `main`; stage 3 on prod is the cut (nothing else); the App Hosting rollout and the Cloud Run source deploy cannot be Terraform resources, so they stay CLI steps inside Actions; the placeholder `prod-admin@beatrix.ai` in `prod.tfvars` stays until provisioning; the default compute service account stays for all functions.

## Risks / Trade-offs

- [All functions share one source zip, so any change under `functions/` updates every function] → accepted; unchanged code still gives no diff.
- [Two states mean two places a plan can go stale] → each stage applies its own saved plan, and Terraform refuses a stale one.
- [`removed` blocks forget the first-iteration resources while stage 2 imports them] → stage 1 always applies first; the stage-1 plan must show only forgets and no destroy before the move is applied, which the migration task checks.
- [A function is exported but not yet deployed on dev, so its import fails] → compare the list with what is deployed before the first plan.
- [The Cloud Functions builder might not install with pnpm] → already confirmed on dev by the `status` spike; a failed build leaves the previous revision serving.
- [Adoption shows a replace for some function] → the plan guard fails the run before approval.
- [A prod commit not on `main`] → refused in Verify; an unreleased branch cannot be deployed to prod.
- [`release/<version>` created by the pipeline looks like a push to other workflows] → release branches trigger no deploy and no release; only a prod run does.
- [Authoritative bindings remove an invoker someone added on purpose] → that is the intent; documented in `docs/DEPLOYMENT.md`.
- [Prod pipeline fails after stage 1 or 2 applied] → nothing is rolled back automatically; the cut is skipped and the summary says no release was cut, so a corrected re-run is safe.

## Migration Plan

1. Branch `feature/92-terraform-functions-prod-project` (issue #92, replacing the closed #80), from `main`.
2. Create `terraform/functions/` and move the function resources; add the `removed` blocks to `terraform/`; check both plans read-only against dev: stage 1 shows only forgets and no destroy, stage 2 shows imports and creates and no delete or replace.
3. Dev, with the owner's explicit yes: apply stage 1 (forgets), then stage 2 (adopt the bucket and the 23 functions, bindings, new source object); verify the functions answer for the site's identity and re-plan shows no changes; set `adopt_existing_functions = false` in a follow-up commit.
4. Prod: the user provisions `asterion-453905` with `./scripts/recreate-environment.sh prod` (manual steps theirs). The first prod plans create everything and are reviewed at the `prod-release` gate.
5. Rollback on dev: revert the PR; the functions keep running, and the old `firebase deploy --only functions` from an earlier commit re-adopts them.
