---
name: provision-environment
description: Create, recreate or repair a Beatrix.ai environment (dev, staging, production) in GCP/Firebase. Guides the user through each manual step (project, billing, Storage, sign-in) and automates the rest. Use when the user asks to create, set up, provision, recreate or fix an environment, or when a deploy fails because an environment is missing something.
---

# Provision an environment

The canonical runbook is `terraform/README.md`; this is the procedure to follow. The user does the manual steps; you do everything else, and you never do the manual steps yourself.

## 1. Confirm the target

- Environment name (`dev`, `staging`, `production`) and its project ID from `terraform/environments/<env>.tfvars`.
- If the tfvars file does not exist, create it from `dev.tfvars`. Ask the user for `allowed_admin_emails` (CMS admins) and `developer_members` (e.g. `user:name@example.com`, may run the dev server against it) instead of guessing.
- For `production`, say clearly that provisioning creates infrastructure only. The app is deployed there only by a manual run of the Deploy workflow, so ask before triggering one.

## 2. Run the script and loop on manual steps

```bash
./scripts/recreate-environment.sh <env>
```

Run it in the background, since it can take several minutes. It is safe to re-run.

- **Exit code 3** means `ACTION REQUIRED`. Tell the user the **first** listed step, with its link, in plain words, and ask them to say when it is done. Then give the next one, or re-run the script once all are done. Do not batch them into a wall of text unless the user asks for all at once.
- Any other failure: read the error, fix the code (Terraform, scripts) if it is a bug, and re-run. If the fix needs a console or account change, it is a manual step: ask the user for it.
- Never: create projects, change billing, click console setup buttons, or edit `scripts/env-preflight.sh` to skip a check.

## 3. Verify and report

- `curl -s -o /dev/null -w '%{http_code}' <site URL>` should return 200, and the page should show the profile.
- `gh variable list --env <env>` should list `GCP_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOYER_SERVICE_ACCOUNT` and `TF_STATE_BUCKET`.
- Report the site URL, what was created, and anything not verified.
- Any infrastructure change you made along the way goes through Terraform and a PR (see `.claude/rules/infra.md`).
