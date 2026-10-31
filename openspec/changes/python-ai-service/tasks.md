# Tasks

## 1. Python service

- [x] 1.1 Create `python/` with `pyproject.toml`, `app/__init__.py`, `app/config.py` (env settings, optional `MODEL_API_KEY`) and `app/main.py` (`/health`, `/hello`, `/ws` greeting and echo)
- [x] 1.2 Add `Dockerfile` (non-root, `$PORT`), `.dockerignore`, `.env.example` (empty key) and a README (run locally, set the secret)
- [ ] 1.3 Run it locally and check `/health` and a WebSocket client against `/ws`; build the container image

## 2. Terraform

- [x] 2.1 Enable `secretmanager.googleapis.com`; add the runtime service account, the `model-api-key` secret shell (no version) and its accessor binding
- [x] 2.2 Output the service name and region; keep `terraform fmt` and `npm run infra:check` passing

## 3. Deploy pipeline

- [x] 3.1 Add the `python` component hash to `scripts/deploy/components.sh`
- [x] 3.2 Deploy it in `scripts/deploy-backend.sh` (`gcloud run deploy --source python`, private, secret mounted only when a version exists, invoker binding for the App Hosting account)
- [x] 3.3 Include `python` in the workflow's decision loop, deploy and record steps and in the run summary
- [x] 3.4 Add `google_secret_manager_secret` to `PROTECTED_TYPES` with a test in `scripts/deploy/test_plan_guard.py`
- [x] 3.5 Run `scripts/check-scripts.sh` and `npm run infra:check`

## 4. Verify

- [ ] 4.1 Run `npm run check`, `openspec validate --all`, and a dev deploy; confirm a second deploy without `python/` changes leaves the service untouched and anonymous calls are rejected

## 5. Docs

- [x] 5.1 Update `docs/DEPLOYMENT.md`, `CLAUDE.md` and `README.md` (new component, secret setup, private invoker)
