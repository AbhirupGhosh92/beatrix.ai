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
  value       = data.google_firebase_web_app_config.default.app_id
  description = "Firebase App ID."
}

output "server_service_account_email" {
  value       = google_service_account.server_sa.email
  description = "Email of the service account used by Next.js server / App Hosting."
}
