# Tasks

## 1. Function resources and the dev spike

- [ ] 1.1 Add `terraform/functions.tf`: `local.function_names` (the 17 exports), the `<project>-functions-src` bucket, the `archive_file` zip of `functions/lib` + `package.json` + `pnpm-lock.yaml` + `pnpm-workspace.yaml`, the hash-named bucket object, the `google_cloudfunctions2_function` `for_each` mirroring the deployed settings (design.md decision 1), and the authoritative `run.invoker` binding for the App Hosting service account; verify `terraform fmt -check`, `terraform init -backend=false` and `terraform validate` pass
- [ ] 1.2 Add `scripts/check-functions.sh` (the Terraform list must equal the exports of `functions/src/index.ts`, in both directions) and call it from `scripts/check-scripts.sh`; verify it passes, and fails with a clear message when a name is temporarily removed from either side (revert after)
- [ ] 1.3 Add `google_cloudfunctions2_function` to `PROTECTED_TYPES` in `scripts/deploy/plan_guard.py` with a test that a function delete or replace is blocked and an in-place update is not; verify `python3 -I -m unittest discover -s scripts/deploy -p 'test_*.py'` passes
- [ ] 1.4 Spike on dev: build `functions/`, run `terraform plan -target` limited to the `status` function, its bucket, object and binding against `beatrix-ai-dev` (read-only); verify the plan shows the import plus an in-place update and no replace. Ask the user before any apply; with their yes, apply and verify `status` still answers through the site server and that the builder accepted pnpm

## 2. Adopt all 17 dev functions

- [ ] 2.1 Add the `import` blocks (`for_each = var.adopt_existing_functions ? local.functions : {}`), the `adopt_existing_functions` variable (default false), `adopt_existing_functions = true` in `dev.tfvars`, and outputs for the function URLs; verify `terraform validate` passes
- [ ] 2.2 Plan the full set against dev (read-only) and run the plan guard on it; verify the plan has 17 imports, 17 in-place updates, 17 bindings, 1 bucket, 17 objects and no delete or replace (record the counts in the PR)
- [ ] 2.3 Document the adoption and the follow-up flag flip in `docs/DEPLOYMENT.md` and `terraform/README.md`; verify the documented commands match the files

## 3. Pipeline: Terraform owns functions and rules

- [ ] 3.1 In the Plan job install pnpm and Node, build `functions/`, run the plan, upload `functions.zip` next to `tfplan`, and in Apply download both to the same path (no rebuild); verify `ruby -ryaml` parses the workflow and a dev run shows the zip saved and restored with the same md5
- [ ] 3.2 Reduce `components.sh` and `deploy-backend.sh` to the `apphosting` component, remove the rules deploy and the functions `predeploy` from `firebase.json`, and delete their markers logic; verify `bash scripts/check-scripts.sh` passes and `deploy-backend.sh --components functions` is rejected with a clear message
- [ ] 3.3 Derive the functions and rules rows of the decision table from `plan.json` (resource types and addresses, or "unchanged, not touched"); for `prod` force the component list empty and show the App Hosting row as a manual rollout; verify by running the step locally against a sample `plan.json` for a no-change plan and a one-function-change plan
- [ ] 3.4 In Verify, for `prod` only, fail early when `RELEASE_NOTES.md` is missing or empty on the ref; verify with a local run of the step on a tree with and without the file
- [ ] 3.5 Update `docs/DEPLOYMENT.md` (guarantees table, stages, components, the new ownership, authoritative invoker binding) and the `deployment-pipeline` wording in `CLAUDE.md`/`AGENTS.md`/`.claude/rules/environments.md`; verify `grep -n "firebase deploy --only functions" docs CLAUDE.md AGENTS.md` finds nothing outdated

## 4. Release after a successful prod deploy

- [ ] 4.1 Convert `.github/workflows/release.yml` to `workflow_call` (inputs `ref`, `sha`, `contents: write`, no push trigger) deriving `vX.Y[.Z]` from the ref and reading `RELEASE_NOTES.md` at the deployed SHA; add the `release` job to `deploy.yml` (`needs: manual`, prod and success only); verify the YAML parses, the branch-push trigger is gone and the pin check in `infra-check.yml` still passes
- [ ] 4.2 Show "release published" or "no release published" in the prod run summary; document the new release flow in `docs/DEPLOYMENT.md` and `CLAUDE.md` (Releases section); verify by reading the rendered summary step

## 5. Dev functions script

- [ ] 5.1 Add `scripts/deploy-functions-dev.sh` (project from `dev.tfvars`, refuses any other project, build, targeted plan, plan guard, confirmation or `--yes`, apply of the saved plan, ownership notice, `log.sh` format); verify `bash -n`, that it refuses `--project <prod id>`, and that a dry plan against dev runs
- [ ] 5.2 Document the script in `docs/DEPLOYMENT.md` and the `dev-deploy` skill; verify `grep -n deploy-functions-dev` finds both

## 6. Prod project

- [ ] 6.1 Set `project_id = "asterion-453905"` in `terraform/environments/prod.tfvars`; replace the three `beatrix-ai-prod` mentions in `docs/DEPLOYMENT.md`; verify `grep -rn beatrix-ai-prod` (outside the archive) finds nothing and `terraform validate` passes
- [ ] 6.2 Update the `prod-deploy` skill for the new prod flow (one reviewed apply, no CLI components, manual App Hosting rollout from the release branch, release published after success); verify the skill text states each of those

## 7. Specs, checks and wrap-up

- [ ] 7.1 Run `openspec validate --all --strict`; verify it exits 0
- [ ] 7.2 Run `npm run typecheck`, `npm run lint`, `npm run build`, `npm run infra:check` and `bash scripts/check-scripts.sh`; verify all pass and record in the PR Verification only what was actually run
- [ ] 7.3 Update the docs affected by this change: `CLAUDE.md` (Deployment and Releases sections), `AGENTS.md`, `README.md` (generated sections via the pre-push hook), `docs/DEPLOYMENT.md`, `terraform/README.md`, `.claude/rules/environments.md`; verify `grep -rn "functions component\|rules component" CLAUDE.md AGENTS.md README.md docs terraform .claude` finds nothing outdated

## Workflow follow-up

- Rebase onto `main` after #81 merges, then archive with `/opsx:archive` before the PR is marked ready.
- First dev apply: review the adoption plan at the pipeline's Plan step, then set `adopt_existing_functions = false` for dev in a follow-up commit.
- Prod (the user's steps): create the `asterion-453905` project and run `./scripts/recreate-environment.sh prod`; replace the placeholder admin email in `prod.tfvars`; connect the prod App Hosting backend to the repository and create each rollout by hand from the release branch.
