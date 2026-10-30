---
name: prod-deploy
description: Deploy the current release branch to the Beatrix.ai prod environment through the Deploy workflow, with explicit confirmation, and narrate every step. Use only when the user explicitly asks to deploy to prod or to release. Refuses unless the current branch is release/<major.minor[.patch]>.
---

# Deploy the current release branch to prod

Prod is the project in `terraform/environments/prod.tfvars` (read `project_id` from there, never hard-code it). Prod is deployed only by a manual run of the Deploy workflow: release ref, typed `prod` confirmation and approval by a `prod-release` reviewer. This skill starts that run and narrates it. It never approves, never bypasses, and never starts without the user's explicit yes in chat.

## 1. Refuse early (all must hold)

```bash
git rev-parse --abbrev-ref HEAD    # must match ^release/[0-9]+\.[0-9]+(\.[0-9]+)?$
git status --porcelain             # must be empty
git fetch origin && git rev-parse HEAD origin/<branch>   # must be equal: the release is what is on GitHub
test -s RELEASE_NOTES.md           # must exist and be non-empty
gh auth status
grep project_id terraform/environments/prod.tfvars
```

If the branch is not a release branch (for example `main` or `feature/*`), stop and tell the user to switch to the release branch. If anything else fails, stop and say which check failed and what to do. Say what each check showed, one line each.

## 2. Show what is about to happen and ask

Show: the branch, the commit (`git log -1 --format='%h %s'`), the prod project id from the tfvars, and that the run will: verify, plan with the plan guard, wait for a `prod-release` reviewer, then apply the reviewed plan and deploy only what changed. Ask one yes/no question: "Deploy `<branch>` (`<sha7>`) to prod project `<project_id>`?" Wait for the answer. A yes covers only this run.

Leave `allow_destructive` and `redeploy_all` off. Set them only if the user asked for that specific thing, after you have explained what it does.

## 3. Start and follow

```bash
gh workflow run deploy.yml --ref <branch> -f environment=prod -f ref=<branch> -f confirm=prod
gh run list --workflow=deploy.yml --event workflow_dispatch --limit 1 --json databaseId,url,status
```

Narrate each job as it starts and ends: **Policy**, **Gate** (a prod run with no GCP variables fails here: tell the user to run `./scripts/recreate-environment.sh prod`), **Verify**, **Plan** (plan guard and the decision table), **Approve**, **Apply**.

When the run waits at **Approve prod**, tell the user it is waiting for a `prod-release` reviewer, show the decision table from the Plan job summary (what will deploy and what will not be touched), and give the run URL. The user (or another reviewer) approves in GitHub. Never approve through the API, never edit environment protection rules.

Poll with `gh run view <id> --json status,conclusion,jobs` (long waits in the background). Pull the decisions once jobs finish:

```bash
gh run view <id> --log | grep -E '\[(decision|result)\]'
```

## 4. Report

- The decision table: each part deployed or "not touched" with the reason, and whether a CMS snapshot was taken.
- The smoke test result and the site URL.
- If it failed: the failing step, the `Next:` hint, and what was already applied. Do not retry blindly; never weaken a guard to pass.
- Remind the user of the manual follow-ups that are theirs: checking the site, and anything the release process asks for after a deploy (release notes live in `RELEASE_NOTES.md`).

## Never

- Deploy without the explicit yes, from a non-release ref, or with a dirty or unpushed tree. Never approve `prod-release` yourself, set `allow_destructive`, or use `-auto-approve` or `firebase deploy --force`.
