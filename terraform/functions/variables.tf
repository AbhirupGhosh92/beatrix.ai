variable "project_id" {
  type        = string
  description = "The GCP project of this environment. Must equal project_id in terraform/environments/<env>.tfvars."
}

variable "environment" {
  type        = string
  description = "Target environment name (dev or prod)."
}

variable "region" {
  type        = string
  description = "GCP region for the functions (e.g., us-central1)."
  default     = "us-central1"
}

variable "adopt_existing_functions" {
  type        = bool
  default     = false
  description = "Import the functions the Firebase CLI already deployed, and the source bucket an earlier apply created (true for the first apply on an environment that has them, false where none exist)."
}
