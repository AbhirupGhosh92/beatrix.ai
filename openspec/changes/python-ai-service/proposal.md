# Proposal

Fixes #83 (branch `feature/83-python-ai-service`).

## Why

The job tracker will later generate tailored resume JSON with LangChain, which needs a Python home, an API key kept in Secret Manager and a deploy path before any AI logic exists. Streaming results need WebSockets, which Cloud Functions (HTTP) cannot accept but Cloud Run can.

## What Changes

- New `python/` folder with a minimal FastAPI service: `GET /health`, a hello world HTTP route and a `/ws` WebSocket that greets and echoes. An `app/` package is the place for LangChain code; settings come from environment variables only.
- The model API key is read from an environment variable that Cloud Run fills from a Secret Manager secret. No key is committed and hello world needs none.
- The service runs on Cloud Run in each environment under its own service account, private by default: only the App Hosting service account may invoke it.
- Terraform creates the service account, the empty secret and the IAM bindings. The secret value is set by the user outside Terraform, so it never reaches state.
- The deploy pipeline gets a fourth component, `python`, with its own source hash. It is deployed from source only when `python/` changed.

Out of scope: any LangChain or AI logic, prompts or model calls; calling the service from the Next.js app; public access, end-user authentication on the WebSocket and a custom domain.

## Capabilities

### New Capabilities
- `python-ai-service`: the hello world service, its WebSocket, configuration and secret handling, and who may call it.

### Modified Capabilities
- `deployment-pipeline`: the Python service is a fourth component that deploys only when its sources changed, and its secret and service account are protected resources.

## Impact

- **Code**: new `python/` (`pyproject.toml`, `Dockerfile`, `app/main.py`, `app/config.py`, `.env.example`, README).
- **Infrastructure**: `terraform/` (Cloud Run API, service account, Secret Manager secret shell, invoker and accessor IAM); `google_secret_manager_secret` added to `PROTECTED_TYPES` with a test.
- **Pipeline**: `scripts/deploy/components.sh`, `scripts/deploy-backend.sh`, `.github/workflows/deploy-environment.yml`, `scripts/check-scripts.sh`.
- **Docs**: `docs/DEPLOYMENT.md`, `terraform/README.md`, `CLAUDE.md`, README.
