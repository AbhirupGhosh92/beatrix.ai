# Environments and deployment

Beatrix.ai runs in two Firebase/GCP projects, all built from this Terraform code:

| Environment | tfvars | Deployed |
|---|---|---|
| `dev` | `environments/dev.tfvars` | automatically on every push to `main` |
| `prod` | `environments/prod.tfvars` | **only manually**: Actions > Deploy > Run workflow > `prod` + ref |

`.github/workflows/deploy.yml` drives this. Each run of `.github/workflows/deploy-environment.yml` verifies the code, makes a Terraform **plan** (blocked if it would delete or replace a stateful resource), asks for approval on `prod`, snapshots the CMS files, applies the **saved plan**, and then deploys only the components (Cloud Functions, rules, App Hosting site) whose sources changed. An environment whose GitHub environment has no variables yet is skipped with a notice (dev), so merging is safe before dev exists; an unprovisioned `prod` fails the run.

The whole pipeline, its guarantees, the one-time GitHub setup (environments, reviewers) and the deploy, rollback and restore runbooks are in [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md). Read it before deploying `prod`.

## Runbook: provisioning an environment (agents MUST follow this)

Provisioning is split between **manual steps the user does** and **automation the agent runs**. An agent never does the manual steps itself (no `gcloud projects create`, no billing changes, no console clicks, no creating Storage or sign-in providers), never works around a failed check, and never edits these checks out. Instead:

1. **Ask first.** Confirm the environment name and project ID with the user. If `environments/<env>.tfvars` does not exist, create it from `dev.tfvars` (ask the user for the CMS admin emails and the developer members).
2. **Run** `./scripts/recreate-environment.sh <env>`. It is idempotent and stops with **exit code 3** and an `ACTION REQUIRED` list whenever a manual step is missing.
3. **On exit code 3**, give the user the listed steps one at a time, in order, with the links printed. Wait until the user says a step is done, then re-run the script. Repeat until it completes.
4. **Report** the site URL printed at the end, and anything that failed.

The manual steps, in the order the script asks for them:

| # | Step (user) | Checked by |
|---|---|---|
| 1 | Install and sign in to `gcloud` (incl. `gcloud auth application-default login`), `firebase` and `gh` | `env-preflight.sh pre` |
| 2 | Create the GCP project with the ID from the tfvars | `env-preflight.sh pre` |
| 3 | Link a billing account to the project | `env-preflight.sh pre` |
| 4 | Firebase console > Storage > **Get started** (creates `<project>.firebasestorage.app`, which the functions read) | `env-preflight.sh post` |
| 5 | Firebase console > Authentication > **Get started**, then enable the **Google** provider | `env-preflight.sh post` |
| 6 | Authentication > Settings > Authorized domains: add the App Hosting domain the script prints | `env-preflight.sh post` |
| 7 | Prod only: in GitHub Settings > Environments, create `prod-release` with **required reviewers** and set the deployment branch rules described in `docs/DEPLOYMENT.md` section 7.2 (the prod approval gate) | not checked |

Everything else is automated by the script: the Terraform state bucket (`gs://<project>-tfstate`, the one bootstrap resource outside Terraform), `terraform plan` + plan guard + apply of that plan (never `-auto-approve` of an unreviewed plan), `.env.local` (dev only), seeding `cms/profile.json` into the default Storage bucket (skipped when it already exists), deploying functions, rules and App Hosting, and writing the GitHub environment variables for CI (`scripts/sync-github-env.sh`).

Run only the checks with `npm run infra:preflight -- <env> [pre|post]`.

## What Terraform manages

- **APIs** for Firebase, Firestore, Storage, Cloud Functions v2, Cloud Run, Cloud Build, Artifact Registry, App Hosting, Identity Toolkit, IAM and STS.
- **Firebase project and web app**, **Firestore** `(default)` (abandoned rather than deleted on destroy in prod), the `<project>-cms-<env>` bucket (not used by the code today; the functions use the default Storage bucket), and the **security rules**.
- **CMS admins**: one `allowed_emails/{email}` document with `admin: true` per `allowed_admin_emails` entry (read as the `admin` role; other users' roles are set with the `role` field and are not managed by Terraform).
- **App Hosting**: backend `beatrix-web` (must match `backendId` in `firebase.json`) with no GitHub connection, running as `firebase-app-hosting-compute@<project>`, the only identity allowed to invoke the Cloud Functions. `developer_members` may impersonate it for local development. The web app config reaches the build as `FIREBASE_WEBAPP_CONFIG`, which `next.config.ts` maps to the `NEXT_PUBLIC_FIREBASE_*` variables.
- **CI identity**: Workload Identity pool `github` that accepts only this repository's jobs running in the GitHub environment with the same name, and the `github-deployer` service account they act as. No keys.
- `beatrix-server-<env>`: legacy server service account, kept for now.

## Manual Terraform workflow

```bash
cd terraform
terraform init -reconfigure -backend-config="bucket=<project_id>-tfstate"
terraform plan -var-file="environments/dev.tfvars"
```

Always `-reconfigure` with the right bucket when switching environments: state is per project, so dev and prod never share it. Run `npm run infra:check` before committing infrastructure or rule changes.
