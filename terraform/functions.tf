# ------------------------------------------------------------------------------
# Cloud Functions (gen2), one per export of functions/src/index.ts.
#
# Terraform owns the functions: the Firebase CLI no longer deploys them, so the plan, the plan guard
# and the prod approver see every change. scripts/check-functions.sh keeps `function_names` equal to
# the exports of functions/src/index.ts. See docs/DEPLOYMENT.md.
#
# The source is built before planning by scripts/build-functions.sh into terraform/.build/functions-src
# (compiled lib/, package.json and the pnpm files, with fixed file times) and zipped here. The zip is
# named by its content hash, so identical code gives an identical plan and no new function revision.
# The pipeline saves the zip next to the plan and Apply never rebuilds it.
# ------------------------------------------------------------------------------
locals {
  function_names = [
    "getProfile",
    "getResumeConfig",
    "adminListFiles",
    "adminGetFile",
    "adminSaveFile",
    "adminListUsers",
    "adminSetUser",
    "sessionCreate",
    "sessionVerify",
    "resumeList",
    "resumeGet",
    "resumeCreate",
    "resumeSave",
    "resumeDelete",
    "applicationList",
    "applicationGet",
    "applicationCreate",
    "applicationUpdate",
    "applicationDelete",
    "applicationCreateResume",
    "adminListResumeOwners",
    "adminPurgeResumeOwner",
    "status",
  ]

  functions = toset(local.function_names)

  # Same value the Firebase CLI set on the deployed functions.
  firebase_config = jsonencode({
    projectId     = var.project_id
    storageBucket = "${var.project_id}.firebasestorage.app"
  })
}

# Where the function source objects live. Small zips named by content hash; they are not deleted
# after a while, because a deleted object would make an unchanged function show a diff.
resource "google_storage_bucket" "functions_src" {
  name                        = "${var.project_id}-functions-src"
  location                    = var.region
  project                     = var.project_id
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  depends_on = [google_project_service.enabled_services]
}

data "archive_file" "functions" {
  type        = "zip"
  source_dir  = "${path.module}/.build/functions-src"
  output_path = "${path.module}/.build/functions.zip"
}

resource "google_storage_bucket_object" "functions" {
  name   = "functions/${data.archive_file.functions.output_md5}.zip"
  bucket = google_storage_bucket.functions_src.name
  source = data.archive_file.functions.output_path
}

resource "google_cloudfunctions2_function" "fn" {
  for_each = local.functions
  project  = var.project_id
  location = var.region
  name     = each.key

  labels = {
    "managed-by" = "terraform"
  }

  build_config {
    runtime     = "nodejs22"
    entry_point = each.key
    # The Firebase CLI sets this so the builder does not run the package's own scripts.
    environment_variables = {
      GOOGLE_NODE_RUN_SCRIPTS = ""
    }
    source {
      storage_source {
        bucket = google_storage_bucket.functions_src.name
        object = google_storage_bucket_object.functions.name
      }
    }
  }

  service_config {
    available_memory                 = "256Mi"
    available_cpu                    = "1"
    timeout_seconds                  = 60
    max_instance_count               = 5
    min_instance_count               = 0
    max_instance_request_concurrency = 80
    ingress_settings                 = "ALLOW_ALL"
    all_traffic_on_latest_revision   = true
    environment_variables = {
      FIREBASE_CONFIG  = local.firebase_config
      GCLOUD_PROJECT   = var.project_id
      LOG_EXECUTION_ID = "true"
    }
  }

  depends_on = [google_project_service.enabled_services]
}

# Only the App Hosting service account may invoke a function. The binding is authoritative, so an
# invoker added by hand (or allUsers) shows up as a removal in the next plan.
resource "google_cloud_run_v2_service_iam_binding" "function_invoker" {
  for_each = google_cloudfunctions2_function.fn
  project  = var.project_id
  location = var.region
  name     = regex("[^/]+$", each.value.service_config[0].service)
  role     = "roles/run.invoker"
  members  = ["serviceAccount:${google_service_account.apphosting_compute.email}"]
}

# First apply on an environment whose functions the Firebase CLI deployed: adopt them in place.
import {
  for_each = var.adopt_existing_functions ? local.functions : toset([])
  to       = google_cloudfunctions2_function.fn[each.key]
  id       = "projects/${var.project_id}/locations/${var.region}/functions/${each.key}"
}

output "function_urls" {
  value       = { for name, fn in google_cloudfunctions2_function.fn : name => fn.service_config[0].uri }
  description = "URL of each Cloud Function (private: only the App Hosting service account may call them)."
}
