# Tasks

## 1. Function resources and the dev spike (done in the first iteration; the files move in group 4)

- [x] 1.1 Add the function resources (`local.function_names` for every export of `functions/src/index.ts`, the `<project>-functions-src` bucket, the hash-named zip object, the `google_cloudfunctions2_function` `for_each` mirroring the deployed settings, and the authoritative `run.invoker` binding); verified with `terraform fmt -check`, `init -backend=false` and `validate` (first written as `terraform/functions.tf`; moved in task 4.1)
- [x] 1.2 Add `scripts/check-functions.sh` (the Terraform list must equal the exports of `functions/src/index.ts`, in both directions) and call it from `scripts/check-scripts.sh`; verified positive and negative (its path changes in task 4.3)
- [x] 1.3 Add `google_cloudfunctions2_function` to `PROTECTED_TYPES` in `scripts/deploy/plan_guard.py` with tests; verified `python3 -I -m unittest discover -s scripts/deploy -p 'test_*.py'` passes
- [x] 1.4 Spike on dev: planned and, with the owner's yes, applied only the `status` function, its bucket, source object and binding; verified `status` answers 200 for `firebase-app-hosting-compute`, 403 anonymously, with the pnpm build succeeding and a no-change re-plan

## 2. Adopt the dev functions (done in the first iteration)

- [x] 2.1 Add the `import` blocks behind `adopt_existing_functions` (dev true, prod false) and outputs for the function URLs; verified `terraform validate`
- [x] 2.1b Compare `local.function_names` with `gcloud functions list --project beatrix-ai-dev` (read-only); verified all 23 are deployed on dev
- [x] 2.2 Plan the full set against dev (read-only) with the plan guard; verified 23 imports, 23 in-place updates, 23 bindings, 1 bucket, 1 source object and no delete or replace
- [x] 2.3 Document the adoption and the flag flip in `docs/DEPLOYMENT.md` and `terraform/README.md` (reworded for two configurations in group 9)

## 3. Groundwork that still holds

- [x] 3.1 Reduce `components.sh` and `deploy-backend.sh` to the `apphosting` and `python` components, remove the rules deploy and the functions `predeploy` from `firebase.json`; verified `deploy-backend.sh --components functions` is rejected with a clear message

## 4. Split Terraform into the stage-1 and stage-2 configurations

- [x] 4.1 Create `terraform/functions/` (providers `google` and `archive`, gcs backend with prefix `terraform/functions`, variables `project_id`, `region`, `environment`, `adopt_existing_functions`, `functions.tf` moved from `terraform/`, output `function_urls`, per-environment tfvars in `terraform/functions/environments/`) and remove `functions.tf`, the `archive` provider, `adopt_existing_functions` and the function outputs from `terraform/`; add a check to `scripts/check-scripts.sh` that each stage-2 tfvars `project_id` equals the stage-1 one; verify `terraform init -backend=false`, `validate` and `fmt -check -recursive` pass in both configurations
- [x] 4.2 Add the `removed` blocks (`lifecycle { destroy = false }`) for the four function resource types to `terraform/`, and make the stage-2 import of the already-existing source bucket part of `adopt_existing_functions`; verify with read-only plans against dev that the stage-1 plan shows only removals from state and no destroy, and the stage-2 plan shows the bucket and function imports, in-place updates, bindings and one new source object with no delete or replace
- [x] 4.3 Point `scripts/build-functions.sh` (stage dir `terraform/functions/.build/functions-src`), `.gitignore` and `scripts/check-functions.sh` (`terraform/functions/functions.tf`) at the new location; verify building twice gives the same zip hash and the check passes and fails when a name is removed
- [x] 4.4 Make `infra-check.yml`, `ci.yml` and the Verify job validate and `fmt -check` both configurations, and keep `scripts/check-infra.sh` and the lock files correct; verify `npm run infra:check` and `bash scripts/check-scripts.sh` pass and a `terraform fmt` mistake in `terraform/functions/` would fail
- [x] 4.5 Apply the move on dev (only with the owner's explicit yes): stage 1 first (forgets only), then stage 2 (adopt the bucket and the 23 functions, bindings, new source object), each from a saved reviewed plan; verify every function still answers 200 for the site identity and 403 anonymously, and that a new plan of each stage shows no changes

## 5. The two pipelines and the three stages

- [x] 5.1 Replace `deploy.yml` with `deploy-dev.yml` (push to `main`, plus a manual dev run) and `deploy-prod.yml` (`workflow_dispatch` only; inputs `ref` default `main`, `version`, `confirm`, `allow_destructive`, `redeploy_all`), both calling the reusable `deploy-environment.yml`; verify both parse with `ruby -ryaml`, the dev file has no prod inputs, and nothing triggers prod automatically
- [x] 5.2 In `deploy-environment.yml` make the stages explicit jobs: plan stage 1 and plan stage 2 (build the functions, plan, guard, save each plan and the stage-2 zip), approve for prod after both plans, apply stage 1, apply stage 2 and then the Python service when `ai_backend/` changed, stage 3 (dev: App Hosting when app sources changed; prod: nothing here), smoke test; every later job `needs` the earlier one and no job uses `-target`; verify the YAML parses, read the `needs` graph, and check that `grep -rn -- '-target' .github/workflows` finds nothing
- [x] 5.3 Give the decision table one row per stage (stage 1 and stage 2 from their plans, the Python service and App Hosting from their hashes, prod stage 3 as "release cut after success"); verify by running the step locally against sample plans for a no-change run, a one-function change and a first-adoption run
- [x] 5.4 Rework the prod policy and Verify: `ref` defaults to `main` and must be reachable from `main`, `version` must match `^[0-9]+\.[0-9]+(\.[0-9]+)?$`, `confirm` must be `prod`, and fail before any plan when `RELEASE_NOTES.md` is missing or empty or when `release/<version>` or `v<version>` exists at a different commit; verify each case with local runs on a temporary repository

## 6. Cut the release after a successful prod run

- [x] 6.1 Rework `release.yml` into the cut stage (`workflow_call`; inputs `sha`, `version`; creates `release/<version>` at `sha`, the tag and the GitHub release marked Latest with the notes at `sha`; idempotent for the same commit; fails when the branch or tag is at another commit) and call it from `deploy-prod.yml` only after a successful run with `contents: write` granted by that caller; verify the YAML parses, no push trigger exists, the pin check passes, and the create/update/refuse logic with a temporary git repository
- [x] 6.2 Show "release cut" or "no release cut" in the prod run summary; verify by reading the summary step

## 7. Dev functions script and environment bootstrap

- [x] 7.1 Make `scripts/deploy-functions-dev.sh` plan and apply the whole `terraform/functions` configuration (no `-target`), still dev only with the plan guard and a confirmation; verify `bash -n`, that it refuses the prod project and unknown options, and that a dry plan against dev runs and stops before apply
- [x] 7.2 Make `scripts/recreate-environment.sh` apply stage 1, build the functions, then apply stage 2 (each guarded and from a saved plan); verify `bash -n` and a read-through of the order

## 8. Prod project and skills

- [x] 8.1 Set `project_id = "asterion-453905"` in `terraform/environments/prod.tfvars` and remove `beatrix-ai-prod` from the docs; verified by `grep` and `terraform validate`
- [x] 8.2 Update the `dev-deploy` and `prod-deploy` skills (prod takes `ref` on `main` and a `version`, asks once, the release is cut only after success, no App Hosting on prod); verify each point is in the skill text

## 9. Specs, checks and docs

- [x] 9.1 Run `openspec validate --all --strict`; verify it exits 0
- [x] 9.2 Run `npm run typecheck`, `npm run lint`, `npm run build`, `npm run infra:check` and `bash scripts/check-scripts.sh`; verify all pass and record in the PR Verification only what was actually run
- [x] 9.3 Update the docs: `docs/DEPLOYMENT.md` (two pipelines, three stages, the two configurations and the declarative move, prod commit-on-main with a version, the cut release), `CLAUDE.md`, `AGENTS.md`, `README.md` (generated sections via the pre-push hook), `terraform/README.md`, `.claude/rules/environments.md`; verify `grep -rn "deploy.yml\|functions component\|rules component\|-target" docs CLAUDE.md AGENTS.md README.md terraform .claude` finds nothing outdated

## 10. Terraform stops seeding personal emails (#94; replaces the GitHub-variable workaround)

- [x] 10.1 Remove the admin documents and the developer bindings from `terraform/main.tf` with `removed` blocks (`destroy = false`), remove `allowed_admin_emails`, `developer_members` and the placeholder values from `variables.tf`, both tfvars and `terraform.tfvars.example`; verify `terraform validate` passes and a read-only stage-1 plan on dev shows only `forget` for them and no delete or replace
- [x] 10.2 Remove the email-variable workaround (`email-vars.sh`, its test, the workflow wiring, the `sync-github-env.sh` lines); verify `check-scripts.sh` passes and the workflow YAML parses
- [x] 10.3 Add `scripts/add-admin.sh <env|project> <email>` (Firestore REST, update mask, never overwrites other fields) and `scripts/deploy/check-data.sh` (warning when `allowed_emails` is empty, always exit 0), with tests using stubs; verify the tests pass
- [x] 10.4 Show the notice after a deploy (stage 3 step and summary row) and at the end of `scripts/recreate-environment.sh`; make `seed-data.sh` use `add-admin.sh`; verify by running the check against a stub and reading the workflow
- [x] 10.5 Update the docs and skills (`DEPLOYMENT.md` 7.3b, 10.2, limits, troubleshooting; `CLAUDE.md`; `terraform/README.md`; the `provision-environment` skill) including the local-development access command; verify `grep -rn "allowed_admin_emails\|developer_members\|TF_ADMIN_EMAILS" docs CLAUDE.md terraform .claude` finds nothing outdated and `openspec validate --all --strict` passes

## 11. Separate deployments and a script entry for prod

- [x] 11.1 Add `scripts/deploy-prod.sh` (local preflight, typed confirmation or `--yes`, starts the Deploy prod workflow with the exact commit and version, no destructive or redeploy options) and `scripts/deploy-dev.sh`, with tests (`test_deploy_prod_script.py`); verify the tests pass and that a commit off `main`, a taken version, missing notes and a missing confirmation all start nothing
- [x] 11.2 Add `scripts/check-pipelines.sh` to `check-scripts.sh` (prod manual only, dev on `main` and dev-only, shared logic callable only by the two pipelines, concurrency per environment); verify it passes and fails for four deliberate breakages
- [x] 11.3 Point the docs, rules and the `dev-deploy` and `prod-deploy` skills at the scripts; verify `openspec validate --all --strict` passes

## Workflow follow-up

- Work on branch `feature/92-terraform-functions-prod-project` (issue #92, which replaces the closed #80), then archive with `/opsx:archive` before the PR is marked ready.
- First full dev apply: review both plans at the pipeline's Plan step, then set `adopt_existing_functions = false` for dev in a follow-up commit.
- Dev needs real admin emails in its tfvars (or equivalent) before a dev run can pass the plan guard; that is the owner's call and is not part of this change.
- Prod (the user's steps): create the `asterion-453905` project and run `./scripts/recreate-environment.sh prod`; replace the placeholder admin email in `prod.tfvars`; connect the prod App Hosting backend to the repository and create each rollout by hand from the Firebase console.
