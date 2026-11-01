# Proposal

Fixes #83 (branch `feature/83-python-ai-service`).

## Why

The job tracker (#82) will later generate tailored resume JSON from a job description with LangChain. That code needs a Python home, a place for the model API key and a deploy path, ready before any AI logic exists. Streaming results needs WebSockets, which Cloud Functions (HTTP) cannot accept but Cloud Run can, and Cloud Run deploys from the same source.

## What Changes

- New `python/` folder: a minimal FastAPI service with `GET /health`, a hello world HTTP route and a `/ws` WebSocket that greets and echoes, a clear place (`app/`) for LangChain code, and settings read from environment variables. It has a `Dockerfile`, `pyproject.toml`, a README and `.env.example`.
- The model API key is read from an environment variable that Cloud Run fills from a Secret Manager secret. Terraform creates only the secret shell and the access to it; the value is set by the user outside Terraform, so it never lands in state. Hello world needs no real key.
- Terraform adds the Secret Manager API, a dedicated runtime service account for the service, the secret and its accessor binding, and the permission for the App Hosting service account to invoke the service.
- The service is deployed to Cloud Run from source in each environment, private by default (only the App Hosting service account may invoke it).
- The deploy pipeline gets a fourth component, `python`, with its own source hash, so a deploy that does not change `python/` does not redeploy it. The plan guard, the run summary and `docs/DEPLOYMENT.md` cover it.

Out of scope: any LangChain or AI logic, prompts or model calls; calling the service from the Next.js app (the tracker's AI tailoring will do that later); public access, end-user authentication on the WebSocket and a custom domain.

## Capabilities

### New Capabilities
- `python-ai-service`: the service's routes (health, hello, WebSocket greeting and echo), configuration from the environment, how the model API key reaches it, and who may invoke it.

### Modified Capabilities
- `deployment-pipeline`: the Python service is a separately hashed component that is redeployed only when its sources change, and its secret value is never created by the pipeline or Terraform.

## Impact

- New `python/` directory, ignored by the site's and the functions' hashes.
- `terraform/` (API, service account, secret shell, IAM), `terraform/outputs.tf`.
- `scripts/deploy/components.sh`, `scripts/deploy-backend.sh`, `.github/workflows/deploy-environment.yml`, `scripts/deploy/plan_guard.py` (and its test).
- `docs/DEPLOYMENT.md`, `CLAUDE.md`, `README.md`.
- No change to the Next.js app, Cloud Functions or Firestore data.
