output "project_id" {
  value       = var.project_id
  description = "The GCP / Firebase project ID."
}

output "environment" {
  value       = var.environment
  description = "The environment name."
}

output "web_app_id" {
  value       = google_firebase_web_app.default.app_id
  description = "Firebase Web App ID."
}

output "api_key" {
  value       = data.google_firebase_web_app_config.default.api_key
  description = "Firebase API Key for Web App."
  sensitive   = true
}

output "auth_domain" {
  value       = data.google_firebase_web_app_config.default.auth_domain
  description = "Firebase Auth domain."
}

output "storage_bucket" {
  value       = google_storage_bucket.cms_storage.name
  description = "Cloud Storage bucket name for CMS files."
}

output "messaging_sender_id" {
  value       = data.google_firebase_web_app_config.default.messaging_sender_id
  description = "Firebase Messaging Sender ID."
}

output "app_id" {
  value       = google_firebase_web_app.default.app_id
  description = "Firebase App ID."
}

output "server_service_account_email" {
  value       = google_service_account.server_sa.email
  description = "Email of the service account used by Next.js server / App Hosting."
}

output "default_storage_bucket" {
  value       = "${var.project_id}.firebasestorage.app"
  description = "Default Firebase Storage bucket, read by the Cloud Functions (cms/ prefix)."
}

output "apphosting_url" {
  value       = "https://${google_firebase_app_hosting_backend.web.uri}"
  description = "URL of the App Hosting backend."
}

output "apphosting_domain" {
  value       = google_firebase_app_hosting_backend.web.uri
  description = "Domain of the App Hosting backend (must be an authorized domain in Firebase Auth)."
}

output "apphosting_service_account_email" {
  value       = google_service_account.apphosting_compute.email
  description = "Runtime service account of App Hosting, the only allowed Cloud Functions invoker."
}

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Workload Identity provider for google-github-actions/auth."
}

output "deployer_service_account_email" {
  value       = google_service_account.deployer.email
  description = "Service account GitHub Actions deploys as."
}

output "resumes_bucket" {
  value       = google_storage_bucket.resumes_storage.name
  description = "Cloud Storage bucket name for user resumes."
}

output "python_service_account" {
  value       = google_service_account.python_runtime.email
  description = "Runtime service account of the Python AI service (Cloud Run)."
}

output "python_secret_id" {
  value       = google_secret_manager_secret.model_api_key.secret_id
  description = "Secret Manager secret holding the model API key (value set outside Terraform)."
}
