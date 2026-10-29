# Agent Instructions & Guidelines

## Infrastructure & Configuration Policy

1. **Infrastructure via Code (Terraform)**:
   - All GCP and Firebase infrastructure resources (including Firebase projects, Web Apps, Cloud Firestore databases, Cloud Storage buckets, security rulesets, IAM service accounts, and API enablement) MUST be declared in Terraform under the `terraform/` directory.
   - Any modification to Firebase rules (`firestore.rules`, `storage.rules`), app hosting (`apphosting.yaml`), or backend function infrastructure (`functions/`) MUST be reflected in and validated against `terraform/`.

2. **Agent Automation & Change Control**:
   - Infrastructure changes MUST occur via code and agents. Manual changes in the Google Cloud Console or Firebase Console without updating Terraform configurations are prohibited.
   - Always run `npm run infra:check` when making changes to infrastructure or security rules to ensure Terraform configurations remain synchronized and syntax is valid.

3. **Lower Environment Recreation**:
   - To recreate or provision lower environments (such as `dev`, `staging`, `qa`), run:
     ```bash
     npm run infra:recreate <env> [gcp-project-id]
     ```
   - This script initializes Terraform, applies resources, writes `.env.local` configuration, seeds initial CMS and Firestore data, and deploys Cloud Functions and security rules.
