# Design

## Context

Backend code today is Node 22 Cloud Functions in `functions/`, each a private HTTP function invoked only by the Next.js server with a Google ID token (`src/middleware/cloudFunctions.ts`). Cloud Functions cannot hold WebSocket connections; Cloud Run can. The deploy pipeline has three components (`functions`, `rules`, `apphosting`) hashed in `scripts/deploy/components.sh`, deployed by `scripts/deploy-backend.sh` through the Firebase CLI, and recorded after success. The deployer account already holds `roles/run.admin`, `roles/iam.serviceAccountUser` and `roles/artifactregistry.admin`; `run.googleapis.com`, `cloudbuild.googleapis.com` and `artifactregistry.googleapis.com` are already enabled.

## Goals / Non-Goals

**Goals:**
- A runnable, containerised FastAPI hello world with a WebSocket, ready for LangChain code to be added under `python/app/`.
- A model API key that reaches the service only through Secret Manager.
- Private deployment per environment, redeployed only when `python/` changes.

**Non-Goals:**
- Any AI logic, calls from Next.js, public access, end-user auth on the WebSocket, a custom domain.

## Decisions

- **Cloud Run, not a Cloud Function.** WebSockets need Cloud Run. The service name is `beatrix-ai` in the environment's region.
- **Terraform owns identity and secret, the pipeline owns the revision.** Terraform creates the runtime service account `python-ai-runtime`, the Secret Manager secret shell `model-api-key` (no version), the accessor binding for the runtime account, and `roles/run.invoker` for `firebase-app-hosting-compute`. The Cloud Run service itself is deployed by `gcloud run deploy beatrix-ai --source python --no-allow-unauthenticated --service-account ... --set-secrets MODEL_API_KEY=model-api-key:latest`. Alternative considered: a Terraform `google_cloud_run_v2_service` needs an image before the first apply and would tie every code change to Terraform; rejected. The invoker binding is on the project-level `roles/run.invoker` target in a service-scoped binding created after the first deploy by the same deploy step (`gcloud run services add-iam-policy-binding`), because a service-scoped binding needs the service to exist; this is idempotent.
- **Secret value outside Terraform.** The user runs `gcloud secrets versions add model-api-key --data-file=-`. With no version, `--set-secrets ...:latest` would fail the revision, so the deploy sets the secret only when the secret has an enabled version, and the service treats an unset key as "AI disabled" (hello world still works).
- **Component `python`.** `components.sh` gains `python`, hashing `git ls-files python`. `deploy-backend.sh` accepts `python` in `--components` and runs the Cloud Run deploy with `gcloud` (no `--force`); the workflow's component loop and the record step include it. The `functions` hash is unaffected (it covers only `functions/` and the `functions` block of `firebase.json`).
- **Plan guard.** Add `google_secret_manager_secret` to `PROTECTED_TYPES` (with a test in `test_plan_guard.py`); the service account type is already protected.
- **Service shape.** `python/app/main.py` (FastAPI app, `/health`, `/hello`, `/ws`), `python/app/config.py` (settings from the environment, `MODEL_API_KEY` optional), `python/app/` as the future home of LangChain code, `Dockerfile` (slim Python base, non-root, listens on `$PORT`), `pyproject.toml`, `.env.example` with an empty key.

## Risks / Trade-offs

- A Cloud Run request, including a WebSocket, has a maximum duration (set explicitly, up to 60 minutes); long streams will need client reconnect logic later.
- `minInstances` 0 means a cold start on the first connection; acceptable for now, and cost stays at zero when idle.
- Deploy ordering: the invoker binding and the secret mount need the Terraform apply first, which the pipeline already guarantees (apply, then component deploy).
- The new Docker build runs in Cloud Build on the deployer account; no extra role is expected, to be confirmed in the dev run.
