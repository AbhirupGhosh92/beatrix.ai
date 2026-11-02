# Spec Delta

## MODIFIED Requirements

### Requirement: Unchanged components are untouched
Cloud Functions, security rules and infrastructure SHALL be changed only when the Terraform plan shows a difference, and App Hosting and the Python service SHALL be redeployed only when their component source hashes changed. A deploy SHALL NOT write `cms/`.

#### Scenario: Docs-only change
- **WHEN** only documentation changed
- **THEN** the plans show no changes, no function or rule is touched and no App Hosting rollout is created

#### Scenario: Function source changes
- **WHEN** the source under `functions/` changes
- **THEN** the stage-2 plan shows an in-place update of each function's build source, never a replace, and no other infrastructure changes because of it

#### Scenario: Function source unchanged
- **WHEN** the source under `functions/` did not change
- **THEN** the stage-2 plan shows no change for any function

### Requirement: Resume storage is protected and deployed separately
The resumes bucket and the per-owner index SHALL be protected resources: the plan guard SHALL block their deletion or replacement, and the bucket SHALL keep deleted versions for 30 days. The resume functions SHALL change only when the stage-2 plan shows a difference for their resources, and a deploy SHALL NOT write or delete resume data or the resume config.

#### Scenario: Plan deletes the resumes bucket
- **WHEN** a plan would delete or replace the resumes bucket
- **THEN** the run fails before approval and apply

#### Scenario: Unrelated change
- **WHEN** a deploy changes only the landing page
- **THEN** the resume functions and the stored resumes are untouched

### Requirement: Environments and triggers
Only `dev` and `prod` SHALL exist. Every push to `main` SHALL deploy `dev` and nothing else. `prod` SHALL be deployed only by a manual `workflow_dispatch` with a commit on `main`, a release version, a typed `prod` confirmation and one `prod-release` reviewer approval.

#### Scenario: Push to main
- **WHEN** a commit lands on `main`
- **THEN** dev is deployed and prod is not

#### Scenario: Unknown environment
- **WHEN** a run is started for any environment other than `dev` or `prod`
- **THEN** the run fails at the deployment policy check before any cloud access

### Requirement: Reviewed plan is the applied plan
Each deploy SHALL run verify, then a `terraform plan` with the plan guard for each stage, then approval (prod), then apply each stage's saved plan in order. It SHALL NOT use `-auto-approve`, `terraform -target` or `firebase deploy --force`.

#### Scenario: Unreviewed change
- **WHEN** infrastructure differs from the reviewed plan at apply time
- **THEN** the saved plan is still the only thing applied

### Requirement: Nothing to deploy writes nothing
A run whose Terraform plans have no changes and whose components are all unchanged SHALL NOT take a CMS snapshot, deploy a component or write to any data store. Reads, the smoke test and the check for missing data are allowed.

#### Scenario: Docs-only push
- **WHEN** a push changes only documentation or specs
- **THEN** no backup copy is created and no function, rule or App Hosting rollout is made

#### Scenario: Something will deploy
- **WHEN** Terraform has changes or at least one component is changed
- **THEN** the CMS snapshot is taken before the apply

### Requirement: Deploy decision is visible before approval
The plan jobs SHALL decide, for each stage (Firebase configuration and Cloud Functions), the Python service and App Hosting, whether each is changed or unchanged, with the reason, and SHALL show that table in the run summary and to the `prod-release` approver. Apply SHALL act on that decision and no other.

#### Scenario: Prod approval
- **WHEN** a prod run waits for approval
- **THEN** the table of parts to deploy and parts left untouched is already in the run summary

#### Scenario: Redeploy all
- **WHEN** `redeploy_all` is set on a manual run
- **THEN** the table marks every component changed with the reason "redeploy_all"

### Requirement: Deploy skills
The repository SHALL provide a `dev-deploy` skill and a `prod-deploy` skill that start the dev and prod pipelines and report each step. `prod-deploy` SHALL run only for a commit on `main` with a release version, SHALL ask for the user's explicit confirmation before starting, and SHALL NOT approve `prod-release`, set `allow_destructive` or set `redeploy_all` unless the user asks for that specific action.

#### Scenario: Prod from a non-release branch
- **WHEN** `prod-deploy` is used for a commit that is not on `main`
- **THEN** it stops and tells the user to choose a commit on `main`

#### Scenario: Dev deploy of a branch
- **WHEN** `dev-deploy` is used on a pushed branch
- **THEN** it starts a dev run for that ref and reports each step until the run ends

## ADDED Requirements

### Requirement: One pipeline for dev and one for prod
There SHALL be one pipeline for `dev` and one for `prod`. The dev pipeline SHALL run on every push to `main` and MAY be started by hand; the prod pipeline SHALL run only when started by hand. Infrastructure, Cloud Functions and security rules SHALL be changed in both pipelines only by Terraform applied from GitHub Actions.

#### Scenario: Push to main
- **WHEN** a commit is pushed to `main`
- **THEN** the dev pipeline runs and the prod pipeline does not

#### Scenario: Prod started by hand
- **WHEN** an operator starts the prod pipeline with a ref, a version and the typed confirmation
- **THEN** the prod pipeline runs and the dev pipeline is unaffected

### Requirement: Dev and prod are separate deployments
The dev and prod pipelines SHALL be separate workflows that cannot start, target or queue behind each other: the dev pipeline SHALL target only the dev environment and run on merges to `main` and by hand, the prod pipeline SHALL target only the prod environment and run only by hand, and each environment SHALL have its own concurrency group. A check run in CI SHALL fail when the prod pipeline gains an automatic trigger or the dev pipeline can target prod.

#### Scenario: Prod gains a push trigger
- **WHEN** `deploy-prod.yml` is changed to run on a push
- **THEN** the script check fails and the change cannot merge

#### Scenario: Dev and prod at the same time
- **WHEN** a merge deploys dev while a prod run waits for approval
- **THEN** both proceed independently

### Requirement: Prod can be started from a script
`scripts/deploy-prod.sh` SHALL start the prod pipeline for a commit on `main` and a version, SHALL repeat the pipeline's preflight locally before starting it, SHALL require a typed confirmation unless `--yes` is passed, and SHALL NOT offer `allow_destructive` or `redeploy_all`. It SHALL start nothing when the commit is not on `main`, the version is invalid or already cut elsewhere, or the release notes are missing.

#### Scenario: Started from a terminal
- **WHEN** an operator runs the script with a version and types the confirmation
- **THEN** the Deploy prod workflow starts with that exact commit and version

#### Scenario: Refused locally
- **WHEN** the commit is not on `main` or the version is already cut at another commit
- **THEN** the script exits without starting the workflow

#### Scenario: Not confirmed
- **WHEN** the confirmation is wrong or missing
- **THEN** the script exits without starting the workflow

### Requirement: Three stages in a fixed order
Each pipeline SHALL run three stages in order. Stage 1 SHALL apply the Firebase configuration (APIs, Firestore, Storage, security rules, Auth and IAM, the App Hosting backend resource). Stage 2 SHALL apply the Cloud Functions and then deploy the Python service when its source changed. Stage 3 SHALL deploy the app (App Hosting, when app sources changed) on dev and SHALL cut the release on prod. A stage SHALL start only after the previous stage succeeded.

#### Scenario: Dev run
- **WHEN** a dev run has changes in all three parts
- **THEN** Firebase configuration is applied first, then the functions and the Python service, then the App Hosting rollout

#### Scenario: Stage 1 fails
- **WHEN** the stage-1 apply fails
- **THEN** stage 2 and stage 3 do not run

#### Scenario: Stage 2 fails
- **WHEN** a function or the Python service fails to deploy
- **THEN** stage 3 does not run and, on prod, no release is cut

### Requirement: Each stage is its own Terraform plan
Stage 1 SHALL be the Terraform configuration in `terraform/` and stage 2 the configuration in `terraform/functions/`, each with its own state, saved plan, plan guard and apply of that saved plan. No workflow SHALL use `terraform -target`. Terraform SHALL refuse to apply a stage whose plan is stale.

#### Scenario: Plan guard on stage 2
- **WHEN** the stage-2 plan would delete or replace a function
- **THEN** the run fails before approval and apply

#### Scenario: No targeted applies
- **WHEN** the workflows are searched for `-target`
- **THEN** none is found

### Requirement: Functions and rules are owned by Terraform
Every Cloud Function exported by `functions/src/index.ts` SHALL be a Terraform resource in the stage-2 configuration, and the Firestore and Storage security rules SHALL be Terraform resources in the stage-1 configuration, in `dev` and `prod`. The Firebase CLI SHALL NOT deploy functions or rules.

#### Scenario: Function added to the source
- **WHEN** a new function is exported but not declared in `terraform/functions/`
- **THEN** the script check fails before the change can merge

#### Scenario: Rules changed
- **WHEN** `firestore.rules` changes
- **THEN** the change appears in the stage-1 plan and is applied only from the saved plan

### Requirement: Functions are private to the site server
Each function SHALL be invokable only by the App Hosting service account of its project, and no other identity, public or authenticated, SHALL hold the invoker role on a function.

#### Scenario: Extra invoker added by hand
- **WHEN** another identity is given the invoker role on a function outside Terraform
- **THEN** the next stage-2 plan shows that binding being removed

### Requirement: Existing functions are adopted without replacement
Functions already deployed by the Firebase CLI SHALL be adopted into the stage-2 state by import. A plan that would delete or replace a function SHALL stop the run for review unless `allow_destructive` is set.

#### Scenario: First plan after adoption
- **WHEN** the first stage-2 plan runs on an environment with CLI-deployed functions
- **THEN** each function shows an import and an in-place update, never a replace

#### Scenario: Plan would replace a function
- **WHEN** a plan would replace a function
- **THEN** the run fails before approval and apply

### Requirement: Moving resources between the stages is declarative
Resources that an earlier apply placed in the stage-1 state but that belong to stage 2 SHALL move by committed `removed` blocks (destroy disabled) in stage 1 and `import` blocks in stage 2. The move SHALL NOT delete or replace any function or bucket, SHALL NOT need a manual `terraform state` command, and SHALL be a no-op on an environment that never had those resources.

#### Scenario: Stage 1 after the move
- **WHEN** the stage-1 plan runs on an environment whose state holds the moved resources
- **THEN** it shows them being removed from state only and no destroy

#### Scenario: Environment without the resources
- **WHEN** the stage-1 plan runs on an environment whose state never held them
- **THEN** the `removed` blocks change nothing

### Requirement: Unchanged function code produces no diff
The function source archive SHALL be built deterministically and named by its content hash, so identical code SHALL produce an identical plan and no new function revision.

#### Scenario: Re-run on the same commit
- **WHEN** the pipeline runs twice on the same commit
- **THEN** the second stage-2 plan shows no changes to any function

### Requirement: Prod is approved once, after both plans
The prod pipeline SHALL make and guard the plans of both stages before any apply, then wait for one approval by the reviewers of the `prod-release` environment, who see both plans and what else will deploy. Nothing SHALL be applied before that approval.

#### Scenario: Waiting for approval
- **WHEN** both plans are ready and nobody has approved
- **THEN** nothing has been applied to the prod project

#### Scenario: Guard blocks a plan
- **WHEN** a plan guard blocks either plan
- **THEN** the run fails and no approval is requested

### Requirement: Prod deploys a commit on main with a version
The prod pipeline SHALL deploy the commit named by `ref` (default `main`) only when it is reachable from `main`, and SHALL require a `version` of the form `X.Y` or `X.Y.Z` and the typed confirmation `prod`. It SHALL fail before any plan when `RELEASE_NOTES.md` is missing or empty at that commit, or when the branch `release/<version>` or the tag `v<version>` already exists at a different commit.

#### Scenario: Commit on main
- **WHEN** prod is started with `ref` `main` and version `1.3`
- **THEN** the run proceeds to the plans

#### Scenario: Commit not on main
- **WHEN** prod is started with a ref that is not reachable from `main`
- **THEN** the run fails before any plan

#### Scenario: Invalid or missing version
- **WHEN** the version is empty or not `X.Y` or `X.Y.Z`
- **THEN** the run fails before any plan

#### Scenario: Release branch exists elsewhere
- **WHEN** `release/1.3` already exists at a different commit
- **THEN** the run fails before any plan

### Requirement: Prod does not deploy the app
The prod pipeline SHALL NOT deploy App Hosting and SHALL NOT use the Firebase CLI. The prod App Hosting rollout SHALL be created by hand from the Firebase console. The decision table SHALL say so.

#### Scenario: Prod run
- **WHEN** a prod run is approved
- **THEN** the saved plans are applied, the Python service is deployed only if `ai_backend/` changed, and no App Hosting rollout is created by the pipeline

### Requirement: Terraform does not manage personal data
Terraform SHALL create infrastructure only and SHALL NOT create, update or delete the admin documents of `allowed_emails` or per-person access bindings, and the committed tfvars SHALL NOT contain personal email addresses. Admin documents and bindings that already exist SHALL be left untouched when Terraform stops managing them.

#### Scenario: Plan on an environment with real admins
- **WHEN** the stage-1 plan runs on an environment that already has admin documents
- **THEN** the plan shows no delete or replace for them and they keep working

#### Scenario: Stopping to manage existing resources
- **WHEN** the stage-1 plan first runs after this change
- **THEN** the existing admin document and developer binding are only forgotten from the state, not destroyed

### Requirement: Missing data is announced, not blocked
After a deploy, and at the end of environment provisioning, the pipeline and the provisioning script SHALL say when no admin user exists and name the command that adds one. The notice SHALL NOT fail the run. An admin SHALL be addable with `scripts/add-admin.sh <env> <email>`, which SHALL create or update only the admin fields of `allowed_emails/<email>`.

#### Scenario: No admin yet
- **WHEN** a deploy finishes on an environment whose `allowed_emails` is empty
- **THEN** the run succeeds with a warning that names `./scripts/add-admin.sh <env> <email>`

#### Scenario: Adding an admin
- **WHEN** an operator runs the script for an email
- **THEN** `allowed_emails/<email>` exists with `admin`, `allowed` and `role` set, and other fields it already had are unchanged

#### Scenario: Admin already exists
- **WHEN** a deploy finishes on an environment that has an admin
- **THEN** no warning is shown

### Requirement: Prod targets the production project
The `prod` environment SHALL target the GCP project `asterion-453905`, and no document, script or skill SHALL name a different prod project.

#### Scenario: Prod project in tfvars
- **WHEN** `terraform/environments/prod.tfvars` is read
- **THEN** its `project_id` is `asterion-453905`

### Requirement: Dev functions script refuses other environments
The standalone dev functions script SHALL plan and apply only the stage-2 configuration, SHALL run the plan guard, SHALL print that Terraform owns the functions, and SHALL refuse to run against any project other than the dev project.

#### Scenario: Pointed at prod
- **WHEN** the script is run with the prod project
- **THEN** it exits without planning or applying anything
