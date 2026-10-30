# deployment-pipeline Specification

## Purpose
Deploy dev, staging and prod safely so that a release changes only what it changes. Detailed guide: `docs/DEPLOYMENT.md`.

## Requirements

### Requirement: Environments and triggers
Every push to `main` SHALL deploy `dev` then `staging`. `prod` SHALL be deployed only by a manual `workflow_dispatch` with a release ref, a typed `prod` confirmation and `prod-release` reviewer approval.

#### Scenario: Push to main
- **WHEN** a commit lands on `main`
- **THEN** dev then staging are deployed and prod is not

### Requirement: Reviewed plan is the applied plan
Each deploy SHALL run verify, then `terraform plan` with the plan guard, then approval (prod), then apply the saved plan. It SHALL NOT use `-auto-approve` or `firebase deploy --force`.

#### Scenario: Unreviewed change
- **WHEN** infrastructure differs from the reviewed plan at apply time
- **THEN** the saved plan is still the only thing applied

### Requirement: Stateful resources are protected
The plan guard SHALL fail the run when a resource of a protected type (Firestore, Storage buckets, the App Hosting backend, service accounts, workload identity, and so on) would be deleted or replaced, unless `allow_destructive` is set on purpose.

#### Scenario: Plan deletes a bucket
- **WHEN** the plan would delete a `google_storage_bucket`
- **THEN** the run fails before approval and apply

### Requirement: Unchanged components are untouched
Functions, security rules and App Hosting SHALL be redeployed only when their component source hash changed, and a deploy SHALL NOT write `cms/`.

#### Scenario: Docs-only change
- **WHEN** only documentation changed
- **THEN** no function, rule or App Hosting rollout is created

### Requirement: Safety changes keep docs accurate
Changes to the workflows, `scripts/deploy/`, `scripts/deploy-backend.sh` or terraform data protections SHALL update `docs/DEPLOYMENT.md` in the same change.

#### Scenario: New protected resource type
- **WHEN** a data-holding resource is added
- **THEN** it is added to `PROTECTED_TYPES` with a test, and the docs are updated

### Requirement: Resume storage is protected and deployed separately
The resumes bucket and the per-owner index SHALL be protected resources: the plan guard SHALL block their deletion or replacement, and the bucket SHALL keep deleted versions for 30 days. The resume functions SHALL be deployed only when the functions component source hash changed, and a deploy SHALL NOT write or delete resume data or the resume config.

#### Scenario: Plan deletes the resumes bucket
- **WHEN** a plan would delete or replace the resumes bucket
- **THEN** the run fails before approval and apply

#### Scenario: Unrelated change
- **WHEN** a deploy changes only the landing page
- **THEN** the resume functions and the stored resumes are untouched
