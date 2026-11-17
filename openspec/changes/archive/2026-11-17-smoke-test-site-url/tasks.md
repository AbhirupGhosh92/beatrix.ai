## 1. Implementation

- [x] 1.1 Declare `smoke_test_url` in `terraform/variables.tf`
- [x] 1.2 Use it in the Smoke test step of `deploy-environment.yml`, falling back to `apphosting_url`
- [x] 1.3 Set it in `terraform/environments/prod.tfvars`
- [x] 1.4 Update `docs/DEPLOYMENT.md`

## 2. Verification

- [x] 2.1 `terraform fmt -check`, `terraform validate`, `scripts/check-scripts.sh`, `scripts/check-pipelines.sh`
