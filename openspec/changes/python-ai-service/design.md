# Design

## Context

Backend today is Node 22 Cloud Functions in `functions/`, private to the App Hosting service account by IAM and deployed by `scripts/deploy-backend.sh --components` only when a component hash changed (`scripts/deploy/components.sh`, markers in the Terraform state bucket). Terraform in `terraform/` owns identities, buckets and IAM; `scripts/deploy/plan_guard.py` blocks deletes of stateful types. See proposal.md for scope.

## Goals / Non-Goals

**Goals:**
- A runnable, private, deployable hello world with a WebSocket and a clear home for LangChain code.
- The API key is never in the repo or Terraform state.
- The new component follows the existing pipeline guarantees.

**Non-Goals:**
- Any AI logic, a client in the Next.js app, or browser access to the service.

## Decisions

**Cloud Run, not Cloud Functions.** HTTP Cloud Functions cannot upgrade a connection to a WebSocket; Cloud Run supports WebSockets and deploys from source with `gcloud run deploy --source`, so the experience matches "deploy a function". The service sets a request timeout of 3600s (the maximum) and the client is expected to reconnect later. Alternative: Server-Sent Events on a function (rejected: the request was for a WebSocket).

**FastAPI with uvicorn.** `python/app/main.py` defines `GET /health`, `GET /hello` and `WS /ws`; `app/config.py` reads settings (a `pydantic-settings` class with `ai_api_key: str | None`) from environment variables; `app/` is where chains and prompts go. Dependencies are pinned in `pyproject.toml`; LangChain is not added yet, only a documented place for it. A small `Dockerfile` (slim Python base, non-root user, `$PORT`) is used because Cloud Run's buildpack would otherwise guess the entrypoint.

**Terraform owns the identity, secret and service shell; the pipeline owns the image.** Terraform creates the service account `ai-service`, a `google_secret_manager_secret` `ai-api-key` with no version, a `google_cloud_run_v2_service` using Google's placeholder hello image with `ignore_changes` on the image, ingress and invoker IAM for the App Hosting service account, and secret accessor IAM for the service account. The Cloud Run service reads the key as an env var from the secret (`latest`). The deploy script then runs `gcloud run deploy --source python` to replace only the image. Alternative: let `gcloud` create the service and bind IAM in the script (rejected: IAM and secrets would live outside Terraform, against `.claude/rules/infra.md`).

**The secret value is set by the user.** `gcloud secrets versions add ai-api-key --data-file=-` is documented in `terraform/README.md` and `python/README.md`. Terraform never has the value, so it cannot reach state or logs. Hello world works without a version; a service reading `latest` of an empty secret would fail to start, so the env var is wired only after a first version exists (a Terraform variable `ai_secret_wired`, default false). Alternative: a placeholder secret version (rejected: a fake secret in state invites confusion).

**New `python` component.** `components.sh` gains `python`: hash of tracked files under `python/` plus the service's Terraform inputs are not included (Terraform changes apply through the plan). `deploy-backend.sh --components` accepts `python`, builds and deploys only then, and `deploy-environment.yml` includes it in the decision table, the changed list and the marker `record` loop. Alternative: fold it into `functions` (rejected: a Python change must not redeploy every function, and the reverse).

**Deployer permissions.** The keyless deployer account gains the roles needed for source deploys: Cloud Run developer on the service, Cloud Build editor, Artifact Registry writer on the repo `cloud-run-source-deploy`, Storage access to the staging bucket and `iam.serviceAccountUser` on the `ai-service` account. Each is scoped to the narrowest resource Terraform allows.

**Protected resources.** `google_secret_manager_secret` and `google_cloud_run_v2_service` are added to `PROTECTED_TYPES` in `plan_guard.py` with a test, and the secret gets `prevent_destroy`.

## Risks / Trade-offs

- [Source deploy needs Cloud Build and Artifact Registry APIs and IAM] → enabled and granted in Terraform; first deploy to an environment is verified manually.
- [WebSocket connections end at the request timeout or on instance replacement] → documented; the client reconnects in the later change. `maxInstances` stays 1 so there is no cross-instance state yet.
- [Placeholder image with `ignore_changes` hides drift] → the image is the only ignored field, and the smoke test calls `/health` through an identity token.
- [Private service cannot be called from a browser] → intended; the Next.js server will proxy later.
- [`ai_secret_wired` flag is an extra manual step] → documented in the runbook; skipping it leaves a working hello world.

## Migration Plan

Apply Terraform to dev first (new resources only, no deletes), set the secret value if wanted, then the first pipeline run deploys the image. Rollback: redeploy the previous revision (`gcloud run services update-traffic`) or delete the component's service; no existing data is touched.

## Open Questions

- Region for the service (default the functions region, `us-central1`). Deferrable: a Terraform variable.
