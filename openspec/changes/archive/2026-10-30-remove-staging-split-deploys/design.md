# Design

## Context

See proposal.md for why. Today `deploy.yml` calls `deploy-environment.yml` (verify, plan, approve, apply) once per environment. Component change detection (`scripts/deploy/components.sh changed`) runs inside the Apply job, after the CMS snapshot has been taken. The "environment is provisioned" check sits in the Plan job, after Verify. Verify is deliberately given no cloud credentials and no GitHub environment. Concurrency is one run per environment.

## Goals / Non-Goals

**Goals:**
- Two environments, no trace of `staging` outside history and archived changes.
- A run that has nothing to change writes nothing.
- The log of every step can be followed without reading the script.
- Keep every existing safety rule (plan guard, saved-plan apply, no `-auto-approve`, no `--force`, pinned actions, protected resources).

**Non-Goals:**
- Changing how functions or rules are deployed (issue #80).
- Changing `prod-release` or `prod` environment protection rules.
- Changing the Terraform resources, state layout or marker format.

## Decisions

**1. A `policy` job then a `gate` job run before Verify.** `policy` has no checkout, no environment and no credentials; it validates the environment name, the ref and the prod rules, so an unknown name never reaches a `environment:` expression (GitHub would create an environment of that name). `gate` decides "provisioned" and declares `environment: ${{ inputs.environment }}` only to read `vars.*`, has `permissions: contents: read` (no `id-token`), no checkout and no cloud access, and outputs `ready`. Verify, Plan and Apply depend on `ready == 'true'`. A `prod` run with missing variables fails here. Alternative: read variables in `deploy.yml` — rejected because the reusable workflow is also the manual path. The cost is one cheap job; the gain is no wasted Verify for an unprovisioned environment. Verify itself keeps no environment and no credentials.

**2. Component detection moves to the Plan job.** Plan already has cloud access, the checkout of the exact commit and Terraform's result. It runs `components.sh changed` for `functions`, `rules` and `apphosting`, applies `redeploy_all`, writes the decision table (part, old hash, new hash, action, reason) to `$GITHUB_STEP_SUMMARY`, and outputs the list. Apply uses those outputs and does not re-detect. The one-run-per-environment concurrency group means markers cannot change between Plan and Apply. Alternative: keep detection in Apply and print it earlier — rejected because the approver could not see the real decision.

**3. The snapshot is conditional.** In Apply, the snapshot (and `harden-buckets.sh`) runs only if `has_changes == 'true'` or the component list is non-empty. `harden-buckets.sh` only turns protection on and writes nothing when already on, so it still runs and logs "already on"; only the copy of `cms/` is skipped. The summary says "no changes, no backup taken".

**4. One logging helper.** `scripts/deploy/log.sh` is sourced by every deploy script and defines `step_start`, `info`, `decision` (what and why), `result` and `fail` (names the step and the next action). Output uses `::group::` / `::endgroup::` in Actions and plain lines locally. Workflow `run:` blocks call the same helper. Alternative: ad-hoc `echo` per step — rejected because the format would drift again.

**5. PR checks are a separate workflow.** `ci.yml` runs on `pull_request` to `main` with `contents: read`, installs both packages, and runs typecheck, lint, build, the functions build and `scripts/check-scripts.sh`. It uses `concurrency` with cancel-in-progress per PR (safe: it holds no cloud access). `deploy-environment.yml` keeps its own Verify as the safety net for the exact commit.

**6. One script check.** `scripts/check-scripts.sh` runs `bash -n` over every `scripts/**/*.sh` and the plan guard unit tests. `deploy-environment.yml`, `infra-check.yml` and `ci.yml` all call it, which removes the drifted lists.

**7. Skills drive the workflow, never bypass it.** `dev-deploy` and `prod-deploy` call `gh workflow run deploy.yml` and follow it with `gh run watch` and `gh run view`, narrating each job and step. They read the project id from `terraform/environments/<env>.tfvars` rather than hard-coding it, so the prod project change in issue #80 needs no skill edit. `prod-deploy` checks: current branch matches `release/<major.minor[.patch]>`, working tree clean, branch pushed and equal to its remote, then asks the user to confirm in chat before starting; the `prod-release` approval stays with the GitHub reviewer.

**8. Staging removal is mechanical.** Delete `staging.tfvars`; reword every `dev, staging` mention; the release runbook step "Staging first" becomes "Dev first". The empty GitHub `staging` environment is deleted by the user.

## Risks / Trade-offs

- [A new `gate` job per run adds a few seconds] → accepted; it removes a full Verify for unprovisioned environments.
- [Detection at Plan time reads markers that a failed earlier Apply did not record] → unchanged behavior: markers are recorded only after a successful deploy, so a failed deploy is retried.
- [Adding `pnpm-workspace.yaml` to the App Hosting hash causes one extra rollout] → documented in the proposal; happens once.
- [`gate` using an environment may show a deployment record for `prod`] → no protection rule is attached to `prod` itself (approval is `prod-release`); assumption recorded below.
- [Skills could be used to start a prod deploy carelessly] → explicit chat confirmation plus the workflow's own typed confirmation and reviewer approval.

## Migration Plan

1. Merge to `main`; the first push deploys `dev` only. Expect one App Hosting rollout (hash input change) and no staging job.
2. The user deletes the empty GitHub `staging` environment.
3. Rollback: revert the PR; no data or infrastructure changes are made by this change.

Assumption: the GitHub `prod` environment has no required reviewers (only `prod-release` does), as `docs/DEPLOYMENT.md` states. If that is wrong, the `gate` job for prod would wait for approval and the design should read variables differently.
