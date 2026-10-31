# Tasks

## 1. Python service

- [ ] 1.1 Create `python/` with `pyproject.toml` (pinned FastAPI, uvicorn, pydantic-settings), `app/__init__.py`, `app/main.py` (`GET /health`, `GET /hello`, `WS /ws` greeting and echo), `app/config.py` and an `app/` placeholder README for LangChain code; verify `uvicorn app.main:app` starts, `curl /health` returns 200 and a WebSocket client receives the greeting and an echo of "ping".
- [ ] 1.2 Add `Dockerfile`, `.dockerignore`, `.env.example` (placeholder names only) and `python/README.md` (run, test, deploy, set the secret); verify `docker build` succeeds and the container serves `/health` on `$PORT`, or state plainly that Docker was unavailable.
- [ ] 1.3 Confirm the service starts and serves with no `AI_API_KEY` set and never logs or returns the key when set; verify with both runs.

## 2. Terraform

- [ ] 2.1 Enable Cloud Run, Cloud Build, Artifact Registry and Secret Manager APIs; add the `ai-service` service account, the `ai-api-key` secret (no version, `prevent_destroy`), the Cloud Run service shell (placeholder image, image ignored, private ingress, timeout 3600s, min 0 and max 1 instances, env from the secret behind `ai_secret_wired`), invoker IAM for the App Hosting service account and accessor IAM for `ai-service`; verify `terraform validate` and `npm run infra:check` pass.
- [ ] 2.2 Grant the deployer account the narrow roles for source deploys (design.md) and expose the service URL and account in `outputs.tf`; verify `terraform plan` for dev shows only additions.
- [ ] 2.3 Add `google_secret_manager_secret` and `google_cloud_run_v2_service` to `PROTECTED_TYPES` in `scripts/deploy/plan_guard.py` with a test; verify the guard test fails on a plan that deletes the secret and passes on the current plan.
- [ ] 2.4 Update `terraform/README.md` with the secret-value command and `ai_secret_wired`; verify the commands are copy-paste correct.

## 3. Pipeline

- [ ] 3.1 Add the `python` component hash to `scripts/deploy/components.sh`; verify `components.sh hash python` is stable and changes when a file under `python/` changes but not when `src/` changes.
- [ ] 3.2 Teach `scripts/deploy-backend.sh --components` to deploy `python` with `gcloud run deploy --source python` (image only, no `--allow-unauthenticated`), and wire it into `.github/workflows/deploy-environment.yml` (changed list, decision table, marker record, smoke test with an identity token); verify `scripts/check-scripts.sh` and `infra-check.yml` rules pass and a run with only website changes marks `python` unchanged.
- [ ] 3.3 Update `docs/DEPLOYMENT.md` (components, permissions, protected resources, rollback) and `CLAUDE.md`'s deployment section; verify they match the scripts.

## 4. Final checks

- [ ] 4.1 Run `npm run check`, `npm run build`, `npm run infra:check` and `openspec validate --all`; verify all pass and record any check not run.
- [ ] 4.2 Update the README structure section via `scripts/update-readme.mjs`; verify `git diff` shows `python/` listed.

## Workflow follow-up

- Archive the change with `/opsx:archive` before the PR is ready and commit the merged specs.
- Do not deploy prod unless asked.
