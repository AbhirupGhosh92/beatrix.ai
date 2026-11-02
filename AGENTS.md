# Agent Instructions & Guidelines

## Infrastructure & Configuration Policy

1. **Infrastructure via Code (Terraform)**:
   - All GCP and Firebase infrastructure resources (including Firebase projects, Web Apps, Cloud Firestore databases, Cloud Storage buckets, security rulesets, IAM service accounts, and API enablement) MUST be declared in Terraform under the `terraform/` directory.
   - Any modification to Firebase rules (`firestore.rules`, `storage.rules`), app hosting (`apphosting.yaml`), or backend function infrastructure (`functions/`) MUST be reflected in and validated against `terraform/`. Cloud Functions and the security rules are Terraform resources (`terraform/functions/functions.tf`): never deploy them with the Firebase CLI, and keep `function_names` equal to the exports of `functions/src/index.ts` (`bash scripts/check-functions.sh`).

2. **Agent Automation & Change Control**:
   - Infrastructure changes MUST occur via code and agents. Manual changes in the Google Cloud Console or Firebase Console without updating Terraform configurations are prohibited.
   - Always run `npm run infra:check` when making changes to infrastructure or security rules to ensure Terraform configurations remain synchronized and syntax is valid.

3. **Environments & Deployment** (full runbook: `terraform/README.md`):
   - There are two pipelines with three stages each (1 Firebase configuration in `terraform/`, 2 Cloud Functions in `terraform/functions/` plus the Python service, 3 the app on dev or the release cut on prod). Every push to `main` deploys `dev` via `.github/workflows/deploy-dev.yml`. `prod` is deployed **only** by a manual run of `.github/workflows/deploy-prod.yml` chosen by the user, with a commit on `main` and a `version`; it never deploys App Hosting. Never add automatic prod deploys, and never trigger one unasked. Deployments are plan-reviewed, plan-guarded and component-selective, and must never touch unchanged data, files, configuration, functions or services: do not weaken that pipeline (no `-auto-approve`, no `firebase deploy --force`, no removing `prevent_destroy`/delete protection/versioning). Read `docs/DEPLOYMENT.md` and `.claude/rules/environments.md` first.
   - To deploy by hand use the skills `dev-deploy` (a pushed ref to dev) and `prod-deploy` (a commit on `main` and a version to prod, only on the user's explicit yes); they run the Deploy dev or Deploy prod pipeline and narrate each step.
   - To create, recreate or repair an environment, run:
     ```bash
     ./scripts/recreate-environment.sh <env>
     ```
     It applies Terraform, seeds data, deploys, and configures the GitHub environment for CI.
   - **Manual steps are the user's.** Creating the GCP project, linking billing, Firebase Storage "Get started", enabling the Firebase Auth Google provider, authorized domains and CLI logins are done by the user. When the script exits with code 3 and prints `ACTION REQUIRED`, give the user those steps one at a time, wait for them to confirm each, and re-run the script. Never do these steps yourself, and never skip, bypass or delete the checks in `scripts/env-preflight.sh`.

## Spec-Driven Development (OpenSpec, from 1.2.0)

1. **Specs are the source of truth.** Current behavior is in `openspec/specs/`; every non-trivial change is a folder in `openspec/changes/<name>/` made with `/opsx:propose`, implemented with `/opsx:apply` and archived with `/opsx:archive` before the PR is ready.
2. **Order of work**: GitHub issue (standard template), then the branch `<feature|bug|spike|hotfix>/<issue-id>-<summary>`, then the OpenSpec change. Review the proposal with the user before writing code.
3. **Exemptions and rules** (typos, dependency bumps, how to write requirements): see `.claude/rules/openspec.md`. Never invent behavior in a spec, and run `openspec validate --all` before finishing.
