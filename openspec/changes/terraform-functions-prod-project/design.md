# Design

## Context

See proposal.md for why. Observed today (dev project `beatrix-ai-dev`, read-only):

- 17 gen2 functions deployed by the Firebase CLI, all `us-central1`, `nodejs22`, `256Mi`, `60s`, max 5 instances, concurrency 80, 1 CPU, ingress `ALLOW_ALL`, default compute service account, labels `deployment-tool=cli-firebase` and `firebase-functions-hash`. Entry points are the camelCase export names (`getProfile`); the Cloud Run services are lowercase (`getprofile`). Environment: `FIREBASE_CONFIG` (`{"projectId","storageBucket"}`), `GCLOUD_PROJECT`, `LOG_EXECUTION_ID`, plus platform-set `FUNCTION_TARGET`/`FUNCTION_SIGNATURE_TYPE`. Each service has exactly one invoker, `firebase-app-hosting-compute@<project>`. Code reads only `GCLOUD_PROJECT`/`GOOGLE_CLOUD_PROJECT`.
- `terraform/main.tf` already owns the rules (`google_firebaserules_ruleset`/`release`, files read from the repo) and the APIs `cloudfunctions`, `cloudbuild`, `run`, `artifactregistry`. The deployer service account already holds `cloudfunctions.admin`, `run.admin`, `storage.admin`, `artifactregistry.admin`, `iam.serviceAccountUser`.
- The pipeline deploys rules a second time with `firebase deploy --only firestore:rules,storage`.
- The GitHub `prod` environment does not exist yet (variables lookup returns 404), so no prod migration is needed. A release `v1.2.1` exists, created by `release.yml` on branch push.

## Goals / Non-Goals

**Goals:**
- Functions and rules are changed only through the reviewed, guarded, saved Terraform plan.
- Identical code gives an identical plan (no diff, no new revision).
- Existing dev functions are adopted in place; nothing is silently replaced.
- Prod is a single reviewed apply; the release is published only after it succeeds.

**Non-Goals:**
- Changing function code, memory, timeout, region, runtime or service account.
- Automating the prod App Hosting rollout or provisioning `asterion-453905`.
- Granular per-function component hashes (Terraform's diff replaces them).

## Decisions

**1. One `google_cloudfunctions2_function` per export, from an explicit list.** `terraform/functions.tf` holds `local.function_names` (the 17 names) and a `for_each` resource whose settings reproduce the deployed values above, so adoption is an in-place update. Env vars set: `FIREBASE_CONFIG`, `GCLOUD_PROJECT`, `LOG_EXECUTION_ID`; the platform sets `FUNCTION_TARGET`/`FUNCTION_SIGNATURE_TYPE` from `entry_point`. The default compute service account is kept (changing it would be a behavior change, out of scope). Alternative: derive the list from the built `lib/index.js` — rejected because a reviewer could not see in the plan or diff which functions exist. A script check (`scripts/check-functions.sh`) compares the list with the exports of `functions/src/index.ts` and runs in `check-scripts.sh`, so CI, Verify and `infra-check` all enforce it.

**2. Deterministic source, named by content hash, saved with the plan.** `archive_file` zips `functions/lib`, `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` (no `node_modules`, no `src`) into `terraform/.build/functions.zip`; the object is `functions/<output_md5>.zip` in a new Terraform-managed bucket `<project>-functions-src` (uniform access, public access prevention, objects deleted after 30 days). The Plan job installs and builds `functions/` first. A saved plan reads the zip from disk at apply time, so the Plan job also uploads the zip next to `tfplan` (`deploy/plans/<run>/functions.zip`) and Apply downloads both to the same path; Apply never rebuilds. Alternative: Apply rebuilds the zip — rejected because a different build could silently differ from the reviewed one.

**3. Authoritative invoker binding.** `google_cloud_run_v2_service_iam_binding` per function with role `roles/run.invoker` and members only the App Hosting service account. Authoritative, so a hand-added invoker (or `allUsers`) shows up as a removal in the next plan. Uses the function's own `service_config[0].service` name, so lowercase naming needs no special case.

**4. Adoption by `import` blocks behind a variable.** `import { for_each = var.adopt_existing_functions ? local.functions : {} ... id = projects/<p>/locations/<r>/functions/<Name> }`. `dev.tfvars` sets it to true for the first apply; `prod.tfvars` leaves it false (nothing exists there, an import of a missing function would fail). A follow-up commit sets dev back to false (imports of already-managed resources are no-ops, so leaving it is safe but noisy). The expected first dev plan: 17 imports, 17 in-place updates (labels and source), 17 binding sets, 1 new bucket and 17 new objects, no replace.

**5. Plan guard protects functions too.** Add `google_cloudfunctions2_function` to `PROTECTED_TYPES` with a unit test: a delete or replace fails the run unless `allow_destructive`. This also reproduces the old "the CLI refuses to delete functions removed from the source" guarantee (a removed function becomes a delete in the plan).

**6. Components shrink to App Hosting on dev.** `components.sh` keeps only `apphosting`; `deploy-backend.sh` accepts only that component; `firebase.json` loses the functions `predeploy` (the block stays for the emulator). The decision table's functions and rules rows are derived from the plan (`resource_changes` by type: functions, source objects and bindings; `google_firebaserules_*`), shown as "N resources change" with the addresses, or "unchanged, not touched". For `prod`, the App Hosting row reads "not deployed by the pipeline: create the rollout by hand from the release branch" and `COMPONENTS` is forced empty, so prod runs no Firebase CLI at all.

**7. Dev functions script through Terraform `-target`.** `scripts/deploy-functions-dev.sh` reads `project_id` from `dev.tfvars`, refuses any other project, builds, plans with `-target` on the function bucket, objects, functions and bindings, runs the plan guard, shows the plan, asks for confirmation (or `--yes`), applies the saved plan, and prints that Terraform owns the functions. `-target` is acceptable here only because it is dev and guarded; the pipeline never uses it. Alternative: Firebase CLI — rejected (the user chose Terraform): it would drift against state.

**8. Release job after a successful prod run.** `release.yml` becomes `workflow_call` (inputs `ref`, `sha`; `contents: write`; no cloud access) and `deploy.yml` calls it from a `release` job: `needs: manual`, `if: inputs.environment == 'prod' && needs.manual.result == 'success'`. It derives the version from the ref (`release/X.Y[.Z]` or `vX.Y.Z`), reads `RELEASE_NOTES.md` at the deployed SHA, and creates or edits the release marked Latest (the existing `gh` logic). Verify (prod only) fails early when `RELEASE_NOTES.md` is missing or empty, before any plan. Calling it from `deploy.yml` rather than inside `deploy-environment.yml` keeps `contents: write` off the dev jobs: GitHub requires a caller to grant what a nested job requests, even for skipped jobs.

**9. Prod project.** `prod.tfvars` `project_id = "asterion-453905"`; the three doc mentions of `beatrix-ai-prod` change; skills read it from the file. State bucket, workload identity condition and GitHub variables derive from the project and environment name, so nothing else is hard-coded.

## Risks / Trade-offs

- [The Cloud Functions builder might not install with pnpm] → the first task is a spike on dev: plan and apply only the `status` function through the new resources before widening to all 17. A failed build leaves the previous revision serving (Cloud Run keeps the last good revision), so a failed update does not take the function down.
- [Adoption shows a replace for some function] → the plan guard fails the run before approval; fix the resource to match the deployed values rather than allowing the replace.
- [The saved zip and the plan drift] → the zip is saved with the plan and Apply never rebuilds; Terraform refuses a plan whose inputs changed.
- [17 builds make Apply slow] → timeout is 60 minutes; Terraform builds in parallel (default 10). Measured on the first dev apply.
- [Authoritative bindings remove an invoker someone added on purpose] → that is the intent (private to the site server); documented in `docs/DEPLOYMENT.md`.
- [Release job skipped silently on a prod failure] → expected; the run summary says "no release published" when `apply` failed.

## Migration Plan

1. Merge #79 (PR #81), then rebase this branch onto `main`.
2. Dev: spike with the `status` function, then widen to all 17 with `adopt_existing_functions = true`; review the first plan (imports and in-place updates only); apply through the pipeline; confirm the site works and the functions are unchanged in behavior; set `adopt_existing_functions = false` in a follow-up commit.
3. Prod: the user provisions `asterion-453905` with `./scripts/recreate-environment.sh prod` (manual steps theirs). The first prod plan creates everything and is reviewed at the `prod-release` gate.
4. Rollback on dev: revert the PR; the previous Terraform-less functions keep running, and `firebase deploy --only functions` from the old commit re-adopts them.

Assumptions: the placeholder `prod-admin@beatrix.ai` in `prod.tfvars` stays until the user supplies the real admin email during provisioning; the default compute service account stays for all functions.
