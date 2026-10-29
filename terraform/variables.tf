variable "project_id" {
  type        = string
  description = "The GCP Project ID for the lower environment (e.g., beatrix-ai-dev)."
}

variable "environment" {
  type        = string
  description = "Target environment name (e.g., dev, staging, qa)."
  default     = "dev"
}

variable "region" {
  type        = string
  description = "GCP region for resources (e.g., us-central1)."
  default     = "us-central1"
}

variable "firestore_location_id" {
  type        = string
  description = "Firestore database location (e.g., nam5 or us-central1)."
  default     = "nam5"
}

variable "allowed_admin_emails" {
  type        = list(string)
  description = "List of admin email addresses to pre-authorize for CMS access."
  default     = []
}
