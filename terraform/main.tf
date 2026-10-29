terraform {
  required_version = ">= 1.5.0"
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
    "apikeys.googleapis.com"
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
  provider     = google-beta
  project      = var.project_id
  display_name = "beatrix-ai-web-${var.environment}"
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
  deletion_policy             = "DELETE"

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
