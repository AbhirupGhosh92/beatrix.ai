# Spec Delta

## MODIFIED Requirements

### Requirement: Unchanged components are untouched
Cloud Functions, security rules and infrastructure SHALL be changed only when the Terraform plan shows a difference, and App Hosting SHALL be redeployed only when its component source hash changed. A deploy SHALL NOT write `cms/`.

#### Scenario: Docs-only change
- **WHEN** only documentation changed
- **THEN** the plan shows no changes, no function or rule is touched and no App Hosting rollout is created

#### Scenario: One function changes
- **WHEN** the source of one function changes
- **THEN** the plan shows a change for that function's resource only

### Requirement: Resume storage is protected and deployed separately
The resumes bucket and the per-owner index SHALL be protected resources: the plan guard SHALL block their deletion or replacement, and the bucket SHALL keep deleted versions for 30 days. The resume functions SHALL change only when the plan shows a difference for their resources, and a deploy SHALL NOT write or delete resume data or the resume config.

#### Scenario: Plan deletes the resumes bucket
- **WHEN** a plan would delete or replace the resumes bucket
- **THEN** the run fails before approval and apply

#### Scenario: Unrelated change
- **WHEN** a deploy changes only the landing page
- **THEN** the resume functions and the stored resumes are untouched

## ADDED Requirements

### Requirement: Functions and rules are owned by Terraform
Every Cloud Function exported by `functions/src/index.ts` and the Firestore and Storage security rules SHALL be Terraform resources in `dev` and `prod`. The Firebase CLI SHALL NOT deploy functions or rules.

#### Scenario: Function added to the source
- **WHEN** a new function is exported but not declared in Terraform
- **THEN** the script check fails before the change can merge

#### Scenario: Rules changed
- **WHEN** `firestore.rules` changes
- **THEN** the change appears in the Terraform plan and is applied only from the saved plan

### Requirement: Functions are private to the site server
Each function SHALL be invokable only by the App Hosting service account of its project, and no other identity, public or authenticated, SHALL hold the invoker role on a function.

#### Scenario: Extra invoker added by hand
- **WHEN** another identity is given the invoker role on a function outside Terraform
- **THEN** the next plan shows that binding being removed

### Requirement: Existing functions are adopted without replacement
Functions already deployed by the Firebase CLI SHALL be adopted into Terraform state by import. A plan that would delete or replace a function SHALL stop the run for review unless `allow_destructive` is set.

#### Scenario: First plan after adoption
- **WHEN** the first plan runs on an environment with CLI-deployed functions
- **THEN** each function shows an import and an in-place update, never a replace

#### Scenario: Plan would replace a function
- **WHEN** a plan would replace a function
- **THEN** the run fails before approval and apply

### Requirement: Unchanged function code produces no diff
The function source archive SHALL be built deterministically and named by its content hash, so identical code SHALL produce an identical plan and no new function revision.

#### Scenario: Re-run on the same commit
- **WHEN** the pipeline runs twice on the same commit
- **THEN** the second plan shows no changes to any function

### Requirement: Prod deploys only through the reviewed plan
A prod deploy SHALL consist of exactly one reviewed `terraform apply` of the saved plan, and SHALL NOT deploy a component with the Firebase CLI. The App Hosting rollout for prod SHALL be created manually from the release branch.

#### Scenario: Prod run
- **WHEN** a prod run is approved
- **THEN** only the saved plan is applied and no App Hosting rollout is created by the pipeline

### Requirement: Prod targets the production project
The `prod` environment SHALL target the GCP project `asterion-453905`, and no document, script or skill SHALL name a different prod project.

#### Scenario: Prod project in tfvars
- **WHEN** `terraform/environments/prod.tfvars` is read
- **THEN** its `project_id` is `asterion-453905`

### Requirement: Dev functions script refuses other environments
The standalone dev functions script SHALL change only the function resources, SHALL run the plan guard, SHALL print that Terraform owns the functions, and SHALL refuse to run against any project other than the dev project.

#### Scenario: Pointed at prod
- **WHEN** the script is run with the prod project
- **THEN** it exits without planning or applying anything
