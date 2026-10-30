# Tasks

## 1. Remove staging

- [x] 1.1 Delete `terraform/environments/staging.tfvars`; reword `terraform/variables.tf`, `scripts/recreate-environment.sh` (comment at line 73) and `.github/ISSUE_TEMPLATE/bug.md`; verify `grep -rni staging terraform scripts .github/ISSUE_TEMPLATE` finds nothing
- [x] 1.2 Remove the `staging` job from `.github/workflows/deploy.yml` and update its header comment so only `dev` runs on push; verify `grep -n staging .github/workflows/deploy.yml` finds nothing and `terraform fmt -check` still passes
- [x] 1.3 Reword `.claude/rules/environments.md`, `.claude/skills/provision-environment/SKILL.md` and `terraform/README.md` to `dev` and `prod` only; verify `grep -rni staging .claude terraform/README.md` finds nothing
- [x] 1.4 Update `docs/DEPLOYMENT.md`: environment table, mermaid diagram, policy list, GitHub environment settings table, file table, and change the release runbook step "Staging first" to "Dev first"; verify `grep -ni staging docs/DEPLOYMENT.md` finds nothing

## 2. Logging helper and verbose scripts

- [x] 2.1 Add `scripts/deploy/log.sh` with `step_start`, `info`, `decision`, `result`, `fail` (using `::group::` in Actions, plain lines locally); verify `bash -n` passes and sourcing it in a shell prints the expected lines
- [x] 2.2 Source `log.sh` in `components.sh`, `backup-snapshot.sh`, `harden-buckets.sh`, `smoke-test.sh` and `deploy-backend.sh`; each prints start, inputs, decision with reason, and result; verify `bash scripts/deploy/components.sh hash functions` still prints only the hash on stdout (log lines go to stderr) and `bash -n` passes for every script
- [x] 2.3 Make `components.sh changed` print the old and new hash and the reason to stderr while keeping `true`/`false` as its only stdout; verify with a local run that `$(... changed ...)` captures just `true` or `false`

## 3. Pipeline workflow changes

- [x] 3.1 Add the `gate` job to `deploy-environment.yml` (reads `vars`, no `id-token`, no checkout) and make Verify, Plan and Apply depend on its `ready` output; a prod run without variables fails there with the `recreate-environment.sh` command; verify with `actionlint` or a `workflow_dispatch` run on dev that an unprovisioned environment skips before Verify
- [x] 3.2 Move component detection into the Plan job, honour `redeploy_all`, write the decision table (part, old hash, new hash, action, reason) to the run summary, and pass the changed list as a job output; verify the table appears in the Plan summary on a dev run
- [x] 3.3 Make Apply use the Plan outputs only, and run the snapshot only when `has_changes == 'true'` or the changed list is non-empty; verify a docs-only push to `main` shows "no changes, no backup taken" and creates no new object under `backups/` in the state bucket
- [x] 3.4 Show the decision table in the Approve job summary for prod; verify the table is in the summary while a prod run is waiting for approval (or, if no prod run is possible, that the job renders it with `act`/a dev dry reading of the workflow)
- [x] 3.5 Replace the plain `echo`s in the workflow `run:` blocks with `log.sh` calls so each step prints start, inputs, decision and result, and failures name the step and the next action; verify by reading one full dev run log end to end
- [x] 3.6 Add `pnpm-workspace.yaml` to the `apphosting` inputs in `components.sh`; verify `components.sh hash apphosting` changes and is stable across two runs
- [x] 3.7 Update `docs/DEPLOYMENT.md` pipeline section for the gate job, plan-time detection, conditional snapshot and logging format; verify the steps listed match the workflow job order

## 4. Shared script check and PR checks

- [x] 4.1 Add `scripts/check-scripts.sh` (`bash -n` over every `scripts/**/*.sh`, then the plan guard tests with `python3 -I`) and call it from `deploy-environment.yml` and `infra-check.yml` in place of their own loops; verify `bash scripts/check-scripts.sh` exits 0 locally
- [x] 4.2 Add `.github/workflows/ci.yml` (pull_request to `main`, `contents: read`, pinned actions, concurrency cancel-in-progress) running install, `npm run typecheck`, `npm run lint`, `npm run build`, the functions build and `scripts/check-scripts.sh`; verify on this PR that the check runs and passes
- [x] 4.3 Document the PR check in `docs/DEPLOYMENT.md` and make sure `infra-check.yml` still enforces the pin and no-force rules; verify `infra-check.yml` passes on this PR

## 5. Deploy skills

- [x] 5.1 Add `.claude/skills/dev-deploy/SKILL.md`: confirm the target ref is pushed, read the dev project id from `terraform/environments/dev.tfvars`, run `gh workflow run deploy.yml -f environment=dev -f ref=<ref>`, follow with `gh run watch`, narrate each job and step, show the decision table and smoke test result; verify the skill lists in the session skill list and a dry read gives correct commands
- [x] 5.2 Add `.claude/skills/prod-deploy/SKILL.md`: require current branch `release/<major.minor[.patch]>`, clean tree, pushed and equal to remote; show the commit and the decision table; ask the user to confirm in chat; then run the workflow with `confirm=prod`; never approve `prod-release`, never set `allow_destructive` or `redeploy_all` unless asked; verify it refuses on `feature/*` and `main` by reading its first checks
- [x] 5.3 Mention both skills in `CLAUDE.md`, `AGENTS.md` and `docs/DEPLOYMENT.md`; verify `grep -n "dev-deploy\|prod-deploy"` finds each file

## 6. Specs, docs and wrap-up

- [x] 6.1 Run `openspec validate --all` and fix findings; verify it exits 0
- [x] 6.2 Run `npm run typecheck`, `npm run lint`, `npm run build` and `npm run infra:check`; verify all pass, and record in the PR Verification only the checks actually run
- [x] 6.3 Update the docs affected by this change: `CLAUDE.md` (Deployment section), `AGENTS.md`, `README.md` (the generated Scripts/Project structure sections via the pre-push hook), `docs/DEPLOYMENT.md` and `terraform/README.md`; verify `grep -rni staging` over those files finds nothing and the README hook leaves no diff

## Workflow follow-up

- Update the stale word "staging" in the `deployment-pipeline` Purpose line when archiving (a direct edit to the main spec, since a delta cannot change Purpose).
- Archive with `/opsx:archive` before the PR is marked ready, and commit the result.
- After merge, delete the empty GitHub `staging` environment (Settings > Environments); this is a manual step for the user.
