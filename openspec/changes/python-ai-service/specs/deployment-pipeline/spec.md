## ADDED Requirements

### Requirement: Python service is a separate component
The Python service SHALL be a deployable component with its own source hash covering `python/`. It SHALL be deployed to Cloud Run only when that hash changed (or `redeploy_all` is set), SHALL appear in the run's decision table, and a deploy SHALL NOT change it when only other components changed.

#### Scenario: Site-only change
- **WHEN** a deploy changes only files under `src/`
- **THEN** no new Cloud Run revision of the Python service is created

#### Scenario: Service change
- **WHEN** a file under `python/` changed
- **THEN** the run lists `python` as WILL DEPLOY and deploys only that component's service

### Requirement: Pipeline never writes secret values
Neither Terraform nor the deploy pipeline SHALL create, read or print the value of the Python service's secret; a deploy SHALL only reference the secret by name.

#### Scenario: Deploy with a secret
- **WHEN** the Python service is deployed
- **THEN** the secret is mounted by reference and its value does not appear in logs or Terraform state
