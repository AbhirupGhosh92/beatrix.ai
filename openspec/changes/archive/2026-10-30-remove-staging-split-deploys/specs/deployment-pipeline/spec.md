# Spec Delta

## MODIFIED Requirements

### Requirement: Environments and triggers
Only `dev` and `prod` SHALL exist. Every push to `main` SHALL deploy `dev` and nothing else. `prod` SHALL be deployed only by a manual `workflow_dispatch` with a release ref, a typed `prod` confirmation and `prod-release` reviewer approval.

#### Scenario: Push to main
- **WHEN** a commit lands on `main`
- **THEN** dev is deployed and prod is not

#### Scenario: Unknown environment
- **WHEN** a run is started for any environment other than `dev` or `prod`
- **THEN** the run fails at the deployment policy check before any cloud access

## ADDED Requirements

### Requirement: Nothing to deploy writes nothing
A run whose Terraform plan has no changes and whose components are all unchanged SHALL NOT take a CMS snapshot, deploy a component or write to any data store. Reads and the smoke test are allowed.

#### Scenario: Docs-only push
- **WHEN** a push changes only documentation or specs
- **THEN** no backup copy is created and no function, rule or App Hosting rollout is made

#### Scenario: Something will deploy
- **WHEN** Terraform has changes or at least one component is changed
- **THEN** the CMS snapshot is taken before the apply

### Requirement: Deploy decision is visible before approval
The Plan job SHALL decide, for infrastructure, functions, rules and App Hosting, whether each is changed or unchanged, with the reason, and SHALL show that table in the run summary and to the `prod-release` approver. Apply SHALL act on that decision and no other.

#### Scenario: Prod approval
- **WHEN** a prod run waits for approval
- **THEN** the table of parts to deploy and parts left untouched is already in the run summary

#### Scenario: Redeploy all
- **WHEN** `redeploy_all` is set on a manual run
- **THEN** the table marks every component changed with the reason "redeploy_all"

### Requirement: Unprovisioned environment is skipped early
An environment without its GitHub environment variables SHALL be skipped before Verify starts, with a notice naming the command that provisions it. A `prod` run without them SHALL fail.

#### Scenario: Dev not provisioned
- **WHEN** a push to `main` runs and `dev` has no GCP variables
- **THEN** the run reports a skip notice and runs no typecheck, lint or build for it

#### Scenario: Prod not provisioned
- **WHEN** a prod run starts without GCP variables
- **THEN** the run fails with the provisioning command in the message

### Requirement: Every step reports what it does
Each pipeline step and deploy script SHALL print a start line, its inputs, its decision with the reason, and its result, grouped per step in the log. A failure SHALL name the step and the next action.

#### Scenario: Step skipped
- **WHEN** a step is skipped
- **THEN** its log says that it was skipped and why

#### Scenario: Step fails
- **WHEN** a step fails
- **THEN** its log names the step and what to check or run next

### Requirement: App checks run on pull requests
Pull requests to `main` SHALL run typecheck, lint, build, the functions build and the deploy-script tests, so a failing change is rejected before it reaches `main`.

#### Scenario: Broken type
- **WHEN** a PR introduces a type error
- **THEN** the PR check fails and nothing is deployed

### Requirement: Deploy skills
The repository SHALL provide a `dev-deploy` skill and a `prod-deploy` skill that run the Deploy workflow and report each step. `prod-deploy` SHALL run only from the current release branch, SHALL ask for the user's explicit confirmation before starting, and SHALL NOT approve `prod-release`, set `allow_destructive` or set `redeploy_all` unless the user asks for that specific action.

#### Scenario: Prod from a non-release branch
- **WHEN** `prod-deploy` is used on a branch that is not `release/<major.minor[.patch]>`
- **THEN** it stops and tells the user to switch to the release branch

#### Scenario: Dev deploy of a branch
- **WHEN** `dev-deploy` is used on a pushed branch
- **THEN** it starts a dev run for that ref and reports each step until the run ends
