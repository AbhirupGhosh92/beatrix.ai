# Environment & Deployment Rules

- Deployment model: every push to `main` deploys `dev`, then `staging` (`.github/workflows/deploy.yml`). `prod` is deployed only by a manual run of that workflow. Never add an automatic trigger for prod, and never deploy prod yourself unless the user asks for that specific deploy.
- To create or fix an environment, follow the runbook in `terraform/README.md` (also the `provision-environment` skill): run `./scripts/recreate-environment.sh <env>`.
- Manual steps belong to the user: creating the GCP project, billing, Firebase Storage "Get started", Firebase Auth Google provider, authorized domains, and logins. When a script exits with code 3 (`ACTION REQUIRED`), relay those steps to the user one at a time, wait until they confirm each, then re-run. Do not perform, skip, bypass or remove these checks.
- Everything else is automated: use the scripts and Terraform, not the console.
