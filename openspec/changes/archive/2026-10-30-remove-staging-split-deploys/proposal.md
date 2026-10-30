# Proposal

Fixes #79

## Why

No staging GCP project exists, yet every push to `main` still runs a staging job, and staging appears in 12 files of code, docs and specs. The pipeline also does work that changes nothing: a docs-only push (run 41014158777) still ran Verify twice and wrote a CMS backup copy to the state bucket, which is kept for 90 days. The step logs say little about what was decided or why, and a prod approver cannot see which parts will deploy before approving.

## What Changes

- **BREAKING (process):** `staging` is removed everywhere. Only `dev` and `prod` exist: a push to `main` deploys `dev` only; `prod` stays manual, from a release ref, behind `prod-release` approval. The release runbook checks `dev` first instead of staging.
- A decision of what will deploy (infrastructure, functions, rules, App Hosting, each "changed: <reason>" or "unchanged, not touched") is made in the Plan job and shown in the run summary and to the prod approver, instead of being decided at Apply time.
- The CMS snapshot is taken only when Terraform has changes or a component will deploy. A run with nothing to deploy writes no backup.
- An environment that is not provisioned is skipped before Verify runs.
- Every pipeline step and deploy script prints a start line, its inputs, its decision with the reason, and its result, grouped per step in the Actions log.
- New PR workflow `ci.yml` runs typecheck, lint, build, the functions build and the deploy-script tests, so a broken change fails on the PR instead of in the dev deploy.
- One shared script check (`scripts/check-scripts.sh`) replaces the two drifted `bash -n` lists in `deploy-environment.yml` and `infra-check.yml`.
- The App Hosting source hash also covers `pnpm-workspace.yaml` (it affects how dependencies install).
- New skills `.claude/skills/dev-deploy` and `.claude/skills/prod-deploy` run each deploy through the workflow and narrate each step. `prod-deploy` works from the current release branch only.

Out of scope: moving Cloud Functions or rules under Terraform, the prod project change to `asterion-453905`, and when the GitHub release is published (all issue #80). Tearing down any GCP project (none exists). Changing the `prod-release` environment protection rules. Deleting the empty GitHub `staging` environment (a manual step for the user).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment-pipeline`: environments and triggers become `dev` and `prod` only; a deploy decides and shows what will change before approval; runs with nothing to deploy write nothing; every step reports what it is doing; PRs run the app checks; deploy skills exist.

## Impact

- `.github/workflows/`: `deploy.yml`, `deploy-environment.yml`, `infra-check.yml`, new `ci.yml`.
- `scripts/deploy/` (new `log.sh`, `components.sh`, `backup-snapshot.sh`, `harden-buckets.sh`, `smoke-test.sh`), `scripts/deploy-backend.sh`, `scripts/recreate-environment.sh`, new `scripts/check-scripts.sh`.
- `terraform/environments/staging.tfvars` (deleted), `terraform/variables.tf`, `terraform/README.md`.
- `.claude/rules/environments.md`, `.claude/skills/provision-environment`, new `dev-deploy` and `prod-deploy` skills.
- `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/DEPLOYMENT.md`, `.github/ISSUE_TEMPLATE/bug.md`, `openspec/specs/deployment-pipeline`.
- One-time effect: the changed App Hosting hash inputs cause a single App Hosting rollout on the first run after merge.
