## ADDED Requirements

### Requirement: Python service deploys only when its sources change
The Python service SHALL be a deployable component with its own source hash. It SHALL be redeployed only when that hash changed or a redeploy of all components is requested, and a deploy SHALL NOT read or write the secret's value.

#### Scenario: Unrelated change
- **WHEN** a commit changes only the website
- **THEN** no new Cloud Run revision of the Python service is created

#### Scenario: Python change
- **WHEN** a commit changes files under `python/`
- **THEN** the decision table marks the Python component changed and only it is deployed from that component

### Requirement: Python service identity and secret are protected
The service account and the Secret Manager secret of the Python service SHALL be protected resources: the plan guard SHALL block their deletion or replacement unless a destructive deploy is explicitly requested. Terraform SHALL create the secret without a value.

#### Scenario: Plan would delete the secret
- **WHEN** a Terraform plan deletes or replaces the secret
- **THEN** the run is blocked before approval

#### Scenario: Secret value
- **WHEN** Terraform applies
- **THEN** no secret value appears in the plan, the state or the logs
