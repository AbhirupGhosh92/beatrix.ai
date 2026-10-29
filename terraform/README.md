# Firebase Infrastructure Automation with Terraform

This directory contains Terraform scripts to automate the provisioning and recreation of the Beatrix.ai GCP and Firebase infrastructure in lower environments (e.g., `dev`, `staging`, `qa`).

## Prerequisites

Ensure you have the following CLI tools installed:
1. **Terraform** (>= 1.5.0)
2. **Google Cloud SDK (`gcloud`)**
3. **Firebase CLI (`firebase-tools`)**
4. **Node.js** (>= 20) and **pnpm**

Authenticate with GCP and Firebase before running Terraform:
```bash
gcloud auth login
gcloud auth application-default login
firebase login
```

## Structure

```text
terraform/
├── main.tf                 # GCP services, Firebase project, Web App, Firestore, Storage, Rules, and IAM
├── variables.tf            # Input variable declarations
├── outputs.tf              # Project & Web App output attributes
├── terraform.tfvars.example# Template for environment variables
└── environments/
    └── dev.tfvars          # Pre-configured tfvars for 'dev' environment
```

## Agent & Automation Governance

As specified in `AGENTS.md`:
- All infrastructure changes **must** happen via agents/code using Terraform files in `terraform/`.
- Manual GCP or Firebase Console modifications are prohibited without updating the Terraform codebase.
- Run `npm run infra:check` before committing infrastructure or rule updates.

## Provisioned Resources

Terraform manages:
- **GCP APIs**: Enables Firebase, Firestore, Storage, Cloud Functions v2, Cloud Run, Artifact Registry, Identity Platform, and IAM APIs.
- **Firebase Project & Web App**: Connects Firebase to the GCP project and registers the web application instance.
- **Cloud Firestore**: Provisions Native mode Firestore database `(default)`.
- **Cloud Storage Bucket**: Creates the primary CMS storage bucket with CORS enabled.
- **Firebase Security Rules**: Deploys `firestore.rules` and `storage.rules`.
- **IAM & Service Accounts**: Creates server service account (`beatrix-server-<env>`) with Firestore User, Storage Object Admin, and Cloud Run Invoker roles.

## Quick Start: Recreating Infrastructure

The easiest way to recreate an entire lower environment is using the master automation script:

```bash
# Recreate the 'dev' environment:
./scripts/recreate-environment.sh dev beatrix-ai-dev
```

This script will:
1. Run `terraform apply` using `terraform/environments/dev.tfvars`.
2. Extract web app configurations into `.env.local`.
3. Upload initial profile JSON to Cloud Storage (`gs://<project>-cms-<env>/cms/profile.json`).
4. Authorize initial admin emails in Firestore (`allowed_emails/{email}`).
5. Build and deploy backend Cloud Functions and security rules.

## Manual Terraform Workflow

If you prefer running Terraform manually:

```bash
cd terraform

# 1. Initialize Terraform plugins
terraform init

# 2. Plan changes
terraform plan -var-file="environments/dev.tfvars"

# 3. Apply changes
terraform apply -var-file="environments/dev.tfvars"
```

After `terraform apply`, seed data and deploy functions using:
```bash
./scripts/seed-data.sh <PROJECT_ID> <BUCKET_NAME> "admin@example.com"
./scripts/deploy-backend.sh <PROJECT_ID>
```
