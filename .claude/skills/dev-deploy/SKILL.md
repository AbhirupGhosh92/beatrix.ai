---
name: dev-deploy
description: Deploy a branch or commit to the Beatrix.ai dev environment through the Deploy dev pipeline and narrate every step. Use when the user asks to deploy to dev, redeploy dev, try a branch on dev, or check why a dev deploy did or did not change something. Never for prod (use prod-deploy).
---

# Deploy to dev

Dev is the project in `terraform/environments/dev.tfvars` (read `project_id` from there, never hard-code it). "Deploy everything" means the full pipeline for that project: Terraform infrastructure (Cloud Functions and the security rules are Terraform resources, so they are in the plan) and the App Hosting site, plus the Python service when `ai_backend/` changed. The pipeline only changes what the plan and the component hashes say changed; anything unchanged is left alone. Force every component only if the user asks for it (`redeploy_all`).

A merge (push) to `main` already deploys dev by itself, and prod is a separate pipeline. Use this skill for a manual dev run of a branch or commit, or to follow and explain a run. To deploy only the Cloud Functions to dev from a laptop, `./scripts/deploy-functions-dev.sh` plans the stage-2 configuration (`terraform/functions/`), runs the plan guard and applies that saved plan after a confirmation; it refuses any project other than dev, and Terraform owns the functions, so never use the Firebase CLI for them.

## 1. Check before starting

Run these and say what each showed, one line each:

```bash
git rev-parse --abbrev-ref HEAD                 # the ref to deploy, unless the user named another
git status --porcelain                          # uncommitted changes are NOT deployed; tell the user if any
git fetch origin <ref> && git rev-parse HEAD origin/<ref>   # the ref must be pushed and equal to its remote
grep project_id terraform/environments/dev.tfvars
gh auth status
```

If the ref is not pushed, stop and ask the user to push it (the workflow deploys what is on GitHub). Do not push for them unasked.

## 2. Start the run

```bash
./scripts/deploy-dev.sh --ref <ref>
```

Do not set `allow_destructive` or `redeploy_all` unless the user asked for that specific thing, and then say what it does first. Find the run:

```bash
gh run list --workflow=deploy-dev.yml --event workflow_dispatch --limit 1 --json databaseId,url,status
```

## 3. Follow it and narrate

The jobs run in this order; tell the user when each starts and ends, in plain words:

1. **Policy**, 2. **Gate** (is dev provisioned; if not the run skips with a notice), 3. **Verify** (typecheck, lint, build, both Terraform stages validated, script checks), 4. **Plan stage 1** (Firebase configuration) and **Plan stage 2** (builds the function source, Cloud Functions plan, plan guard, the decision table), 5. **Apply stage 1** (bucket protection, snapshot, saved plan), 6. **Apply stage 2** (saved plan, then the Python service if it changed), 7. **Stage 3** (App Hosting rollout if the app changed, smoke test). A stage starts only after the previous one succeeded.

Poll with `gh run view <id> --json status,conclusion,jobs` (run long waits in the background, do not busy-loop). Every step logs `[step]`, `[info]`, `[decision]` and `[result]` lines. Pull the decisions out once a job finishes:

```bash
gh run view <id> --log | grep -E '\[(decision|result)\]'
```

## 4. Report

- The decision table from the run summary: one row per stage (Firebase configuration and Cloud Functions from their plans, the Python service and App Hosting from their hashes), each deployed or "not touched" with the reason.
- Whether a CMS snapshot was taken (only when something changed) and the smoke test result.
- The site URL (`terraform output apphosting_url` in the run, or the Firebase console).
- If it failed: the failing step, the `Next:` hint from the error, and whether anything was already applied. Do not retry blindly and never weaken a guard (plan guard, saved-plan apply, pins) to pass.

## Never

- Deploy prod from here. Never use `-auto-approve` or `firebase deploy --force`. Never touch GitHub environment protection rules.
