## ADDED Requirements

### Requirement: Smoke test target is configurable per environment
The smoke test SHALL request the `smoke_test_url` set in the environment's tfvars file when it is not empty, and otherwise the Terraform `apphosting_url` output. Setting `smoke_test_url` SHALL NOT change any Terraform plan.

#### Scenario: URL set
- **WHEN** `terraform/environments/prod.tfvars` sets `smoke_test_url`
- **THEN** the smoke test requests that URL

#### Scenario: URL not set
- **WHEN** the environment's tfvars does not set `smoke_test_url`
- **THEN** the smoke test requests the Terraform `apphosting_url` output
