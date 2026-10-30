# Environment & Deployment Rules

- Deployment model: every push to `main` deploys `dev` (`.github/workflows/deploy.yml`). `prod` is deployed only by a manual run of that workflow. Never add an automatic trigger for prod, and never deploy prod yourself unless the user asks for that specific deploy.
- To create or fix an environment, follow the runbook in `terraform/README.md` (also the `provision-environment` skill): run `./scripts/recreate-environment.sh <env>`.
- Manual steps belong to the user: creating the GCP project, billing, Firebase Storage "Get started", Firebase Auth Google provider, authorized domains, and logins. When a script exits with code 3 (`ACTION REQUIRED`), relay those steps to the user one at a time, wait until they confirm each, then re-run. Do not perform, skip, bypass or remove these checks.
- Everything else is automated: use the scripts and Terraform, not the console.
- Deployment safety is non-negotiable (guide: `docs/DEPLOYMENT.md`). Do not weaken, bypass or remove any of these, even to make a failing deploy pass:
  - never use `terraform apply -auto-approve` of an unreviewed plan, or `firebase deploy --force`, in a workflow or script (`infra-check.yml` fails the build); only `scripts/deploy-backend.sh --allow-destructive` may pass `--force`;
  - never remove or loosen `prevent_destroy`, Firestore delete protection or point-in-time recovery, bucket versioning, or `force_destroy = false`, and never shrink `PROTECTED_TYPES` in `scripts/deploy/plan_guard.py`; add new data-holding resources to it with a test;
  - never set `allow_destructive`, `redeploy_all` or deploy `prod` unless the user asks for that specific action, and never touch `prod-release`/`prod` GitHub environment protection rules;
  - keep third-party actions pinned to full commit SHAs and never put `${{ }}` of user-controlled values (ref, inputs) inside a `run:` script; pass them through `env:`;
  - a deploy must leave unchanged data, files, configuration, functions and services untouched: when adding a deployable part, give it a component hash in `scripts/deploy/components.sh` instead of deploying it unconditionally.
- Keep `docs/DEPLOYMENT.md` accurate whenever `.github/workflows/deploy*.yml`, `scripts/deploy/`, `scripts/deploy-backend.sh` or the data protections in `terraform/` change.
