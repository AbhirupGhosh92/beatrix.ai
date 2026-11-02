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

## ADDED Requirements

### Requirement: One pipeline for dev and one for prod
There SHALL be one pipeline for `dev` and one for `prod`. The dev pipeline SHALL run on every push to `main` and MAY be started by hand; the prod pipeline SHALL run only when started by hand. Infrastructure, Cloud Functions and security rules SHALL be changed in both pipelines only by Terraform applied from GitHub Actions.

#### Scenario: Push to main
- **WHEN** a commit is pushed to `main`
- **THEN** the dev pipeline runs and the prod pipeline does not

#### Scenario: Prod started by hand
- **WHEN** an operator starts the prod pipeline with a ref, a version and the typed confirmation
- **THEN** the prod pipeline runs and the dev pipeline is unaffected

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

### Requirement: Personal emails come from the environment, not from git
The admin and developer emails of an environment SHALL be settable as the GitHub environment variables `TF_ADMIN_EMAILS` and `TF_DEVELOPER_MEMBERS`. When set, they SHALL replace the values of the committed tfvars file in the stage-1 plan; when unset or empty, the tfvars values SHALL be used. A value SHALL be a single-line list of plain quoted strings, otherwise the run SHALL fail before the plan, and the run log SHALL NOT print the addresses.

#### Scenario: Variables set
- **WHEN** `TF_ADMIN_EMAILS` is set on the environment and the tfvars hold a placeholder
- **THEN** the stage-1 plan uses the variable and the real admin document is not deleted

#### Scenario: Variables unset
- **WHEN** neither variable is set
- **THEN** the committed tfvars values are used as before

#### Scenario: Unsafe value
- **WHEN** a variable holds an interpolation or is not a list of quoted strings
- **THEN** the run fails before the plan

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
