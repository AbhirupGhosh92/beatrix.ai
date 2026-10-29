terraform {
  required_version = ">= 1.5.0"

  # State lives in a per-environment bucket (gs://<project_id>-tfstate), passed at init time:
  #   terraform init -reconfigure -backend-config="bucket=<project_id>-tfstate"
  # scripts/recreate-environment.sh creates the bucket and runs this for you.
  backend "gcs" {
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.0.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ------------------------------------------------------------------------------
# Enabled GCP APIs
# ------------------------------------------------------------------------------
locals {
  gcp_services = [
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "identitytoolkit.googleapis.com",
    "firebaseapphosting.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "firebaserules.googleapis.com",
    "firebasestorage.googleapis.com",
    "apikeys.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "sts.googleapis.com"
  ]

  # Roles of the GitHub Actions deployer: it runs `terraform apply` (which manages IAM, service
  # accounts and the identity pool) and `firebase deploy` (functions, rules, App Hosting).
  deployer_roles = [
    "roles/editor",
    "roles/resourcemanager.projectIamAdmin",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.serviceAccountUser",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/firebase.admin",
    "roles/firebaseapphosting.admin",
    "roles/cloudfunctions.admin",
    "roles/run.admin",
    "roles/storage.admin",
    "roles/datastore.owner",
    "roles/artifactregistry.admin"
  ]
}

resource "google_project_service" "enabled_services" {
  for_each           = toset(local.gcp_services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# ------------------------------------------------------------------------------
# Firebase Project & Web App Setup
# ------------------------------------------------------------------------------
resource "google_firebase_project" "default" {
  provider   = google-beta
  project    = var.project_id
  depends_on = [google_project_service.enabled_services]
}

resource "google_firebase_web_app" "default" {
  provider        = google-beta
  project         = var.project_id
  display_name    = "beatrix-ai-web-${var.environment}"
  deletion_policy = "DELETE"

  depends_on = [google_firebase_project.default]
}

data "google_firebase_web_app_config" "default" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.default.app_id
  project    = var.project_id
}

# ------------------------------------------------------------------------------
# Cloud Firestore Database
# ------------------------------------------------------------------------------
resource "google_firestore_database" "default" {
  provider                    = google-beta
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = var.firestore_location_id
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"
  deletion_policy             = var.environment == "production" ? "ABANDON" : "DELETE"

  depends_on = [google_project_service.enabled_services]
}

# ------------------------------------------------------------------------------
# Cloud Storage Bucket for CMS Data
# ------------------------------------------------------------------------------
resource "google_storage_bucket" "cms_storage" {
  name                        = "${var.project_id}-cms-${var.environment}"
  location                    = var.region
  project                     = var.project_id
  force_destroy               = true
  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.enabled_services]
}

# ------------------------------------------------------------------------------
# Firebase Security Rules (Firestore & Storage)
# ------------------------------------------------------------------------------
resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = var.project_id

  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../firestore.rules")
    }
  }

  depends_on = [google_firestore_database.default]
}

resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  project      = var.project_id
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
}

resource "google_firebaserules_ruleset" "storage" {
  provider = google-beta
  project  = var.project_id

  source {
    files {
      name    = "storage.rules"
      content = file("${path.module}/../storage.rules")
    }
  }

  depends_on = [google_storage_bucket.cms_storage]
}

resource "google_firebaserules_release" "storage" {
  provider     = google-beta
  project      = var.project_id
  name         = "firebase.storage/${google_storage_bucket.cms_storage.name}"
  ruleset_name = google_firebaserules_ruleset.storage.name
}

# ------------------------------------------------------------------------------
# Service Account & IAM Setup for Server & Functions
# ------------------------------------------------------------------------------
resource "google_service_account" "server_sa" {
  project      = var.project_id
  account_id   = "beatrix-server-${var.environment}"
  display_name = "Beatrix Server App Service Account (${var.environment})"
}

resource "google_project_iam_member" "server_firestore_admin" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.server_sa.email}"
}

resource "google_storage_bucket_iam_member" "server_storage_admin" {
  bucket = google_storage_bucket.cms_storage.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.server_sa.email}"
}

resource "google_project_iam_member" "server_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.server_sa.email}"
}

# ------------------------------------------------------------------------------
# CMS Admins (Firestore allowed_emails/{email})
# ------------------------------------------------------------------------------
# `allowed` is read by the client sign-in check (src/lib/firebase.ts), `admin` by the admin
# functions (functions/src/auth.ts). A document that already exists must be imported:
#   terraform import -var-file=environments/<env>.tfvars 'google_firestore_document.allowed_admin["<email>"]' \
#     'projects/<project>/databases/(default)/documents/allowed_emails/<email>'
resource "google_firestore_document" "allowed_admin" {
  for_each    = toset([for email in var.allowed_admin_emails : lower(trimspace(email))])
  project     = var.project_id
  database    = google_firestore_database.default.name
  collection  = "allowed_emails"
  document_id = each.key
  fields = jsonencode({
    admin   = { booleanValue = true }
    allowed = { booleanValue = true }
  })
}

# ------------------------------------------------------------------------------
# Firebase App Hosting (Next.js server)
# ------------------------------------------------------------------------------
# The backend's runtime identity. functions/src/http.ts allows only this account (by this exact
# name) to invoke the Cloud Functions.
resource "google_service_account" "apphosting_compute" {
  project      = var.project_id
  account_id   = "firebase-app-hosting-compute"
  display_name = "Firebase App Hosting compute service account"
}

resource "google_project_iam_member" "apphosting_compute_runner" {
  project = var.project_id
  role    = "roles/firebaseapphosting.computeRunner"
  member  = "serviceAccount:${google_service_account.apphosting_compute.email}"
}

# Lets developers run the Next.js dev server against this environment
# (FUNCTIONS_CALLER_SERVICE_ACCOUNT impersonates the App Hosting account).
resource "google_service_account_iam_member" "apphosting_compute_token_creator" {
  for_each           = toset(var.developer_members)
  service_account_id = google_service_account.apphosting_compute.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = each.key
}

# No codebase: CI deploys from source with `firebase deploy --only apphosting`, so each
# environment only changes when a deploy workflow runs for it.
resource "google_firebase_app_hosting_backend" "web" {
  project          = var.project_id
  location         = var.region
  backend_id       = var.apphosting_backend_id
  app_id           = google_firebase_web_app.default.app_id
  service_account  = google_service_account.apphosting_compute.email
  serving_locality = "GLOBAL_ACCESS"
  environment      = var.environment

  depends_on = [google_project_iam_member.apphosting_compute_runner]
}

# ------------------------------------------------------------------------------
# GitHub Actions deployer (Workload Identity Federation, no keys)
# ------------------------------------------------------------------------------
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"

  depends_on = [google_project_service.enabled_services]
}

# Only jobs of this repository running in the GitHub environment named like this one can
# exchange their OIDC token.
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions"

  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.repository"  = "assertion.repository"
    "attribute.environment" = "assertion.environment"
  }
  attribute_condition = "assertion.repository == \"${var.github_repository}\" && assertion.environment == \"${var.environment}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "github-deployer"
  display_name = "GitHub Actions deployer (${var.environment})"
}

resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

resource "google_project_iam_member" "deployer" {
  for_each = toset(local.deployer_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.deployer.email}"
}
