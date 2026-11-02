---
name: prod-deploy
description: Deploy a commit on main to the Asterion AI prod environment through the Deploy prod pipeline with a release version, with explicit confirmation, and narrate every step. Use only when the user explicitly asks to deploy to prod or to release. Refuses unless the commit is on main and a version is given.
---

# Deploy a commit on main to prod and cut the release

Prod is the project in `terraform/environments/prod.tfvars` (read `project_id` from there, never hard-code it). Prod is deployed only by a manual run of the **Deploy prod** workflow (`deploy-prod.yml`): a commit on `main`, a release `version`, the typed `prod` confirmation, and one approval by a `prod-release` reviewer. This skill starts that run and narrates it. It never approves, never bypasses, and never starts without the user's explicit yes in chat.

The pipeline has three stages that run in order, each only after the previous one succeeded: **1** Firebase configuration (`terraform/`), **2** Cloud Functions (`terraform/functions/`, then the Python service if `ai_backend/` changed), **3** cut the release (branch `release/<version>`, tag `v<version>`, GitHub release). It does **not** deploy App Hosting: the user creates the prod rollout by hand in the Firebase console.

## 1. Refuse early (all must hold)

```bash
git fetch origin
git status --porcelain                          # must be empty
git rev-parse HEAD origin/main                  # HEAD must be origin/main (or the user names a commit on main)
git merge-base --is-ancestor <commit> origin/main   # the commit must be on main
git show <commit>:RELEASE_NOTES.md | head       # must exist and be non-empty
gh auth status
grep project_id terraform/environments/prod.tfvars
```

Ask the user for the **version** (`X.Y` or `X.Y.Z`) if they did not give one, and check it is free: `git ls-remote --heads --tags origin "release/<version>" "v<version>"` must print nothing (or only the chosen commit). If the commit is not on `main`, the notes are missing or empty, or the version is taken by another commit, stop and say which check failed and what to do. Say what each check showed, one line each.

## 2. Show what is about to happen and ask

Show: the commit (`git log -1 --format='%h %s' <commit>`), the version, the prod project id from the tfvars, and that the run will: verify (commit on `main`, notes, version free), make **both** plans (Firebase configuration and Cloud Functions) with their plan guards, wait for **one** `prod-release` approval that shows both plans, then apply stage 1, apply stage 2 (and deploy the Python service only if `ai_backend/` changed), smoke-test the site, and only then cut `release/<version>`, `v<version>` and the GitHub release. Say that no App Hosting rollout is created by the pipeline. Ask one yes/no question: "Deploy `<sha7>` to prod project `<project_id>` as version `<version>`?" Wait for the answer. A yes covers only this run.

Leave `allow_destructive` and `redeploy_all` off. Set them only if the user asked for that specific thing, after you have explained what it does.

## 3. Start and follow

```bash
./scripts/deploy-prod.sh <version> [--ref <commit-on-main>] --yes
gh run list --workflow=deploy-prod.yml --limit 1 --json databaseId,url,status
```

The script is the entry point: it repeats the preflight locally, then starts the Deploy prod workflow with that exact commit and version. Pass `--yes` only because the user said yes in step 2; it never offers `allow_destructive` or `redeploy_all`. Do not call `gh workflow run deploy-prod.yml` directly.

Narrate each job as it starts and ends: **Policy**, **Gate** (a prod run with no GCP variables fails here: tell the user to run `./scripts/recreate-environment.sh prod`), **Verify** (the prod preflight), **Plan stage 1**, **Plan stage 2**, **Approve prod**, **Apply stage 1**, **Apply stage 2**, **Stage 3** (smoke test), then **Release** (cut).

When the run waits at **Approve prod**, tell the user it is waiting for a `prod-release` reviewer, show the decision table from the Plan stage 2 job summary (one row per stage: what will change and what will not be touched) and the two plan summaries, and give the run URL. The user (or another reviewer) approves in GitHub. Never approve through the API, never edit environment protection rules.

Poll with `gh run view <id> --json status,conclusion,jobs` (long waits in the background). Pull the decisions once jobs finish:

```bash
gh run view <id> --log | grep -E '\[(decision|result)\]'
```

## 4. Report

- The decision table: each stage deployed or "not touched" with the reason, and whether a CMS snapshot was taken.
- The smoke test result and the site URL.
- Whether the release was cut: the branch `release/<version>`, the tag and the GitHub release exist only when every stage succeeded; if any stage failed, none exists and the run can be repeated for the same commit and version.
- If it failed: the failing step, the `Next:` hint, and what was already applied (stage 1 may be applied when stage 2 failed). Do not retry blindly; never weaken a guard to pass.
- Remind the user of the manual follow-ups that are theirs: creating the App Hosting rollout in the Firebase console, and checking the site.

## Never

- Deploy without the explicit yes, a commit that is not on `main`, or with a dirty or unpushed tree. Never approve `prod-release` yourself, set `allow_destructive`, or use `-auto-approve` or `firebase deploy --force`, and never create the release branch or tag by hand.
