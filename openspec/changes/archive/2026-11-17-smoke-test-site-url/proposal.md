## Why

The prod smoke test requests the Terraform-managed App Hosting backend (`beatrix-web`), but prod is served from the backend `asterion-ai-backend`, created by hand in the Firebase console. The smoke test therefore gets 404 and the release is never cut.

Fixes #121

## What Changes

- An optional `smoke_test_url` in `terraform/environments/<env>.tfvars` (declared in `terraform/variables.tf`, default empty, used by no resource).
- The Smoke test step requests that URL when set, otherwise the Terraform `apphosting_url` output as before.
- Prod sets it to `https://asterion-ai-backend--asterion-453905.us-central1.hosted.app`.
- `docs/DEPLOYMENT.md` describes it.

Out of scope: importing the live backend into Terraform, changing `apphosting_backend_id`, and deploying App Hosting from the prod pipeline.

## Capabilities

### Modified Capabilities

- `deployment-pipeline`: the smoke test target can be set per environment.

## Impact

`.github/workflows/deploy-environment.yml`, `terraform/variables.tf`, `terraform/environments/prod.tfvars`, `docs/DEPLOYMENT.md`. No resource changes: both plans stay empty.
