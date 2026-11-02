terraform {
  required_version = ">= 1.7.0"

  # Stage 2 has its own state in the same per-environment bucket as stage 1 (terraform/), passed at init:
  #   terraform init -reconfigure -backend-config="bucket=<project_id>-tfstate"
  backend "gcs" {
    prefix = "terraform/functions"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
