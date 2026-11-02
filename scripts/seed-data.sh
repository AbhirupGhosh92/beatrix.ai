#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Seed Initial CMS Profile Data (and optionally admin users)
# Usage: ./scripts/seed-data.sh <PROJECT_ID> <BUCKET_NAME> [ADMIN_EMAILS_COMMA_SEPARATED]
# ==============================================================================

PROJECT_ID="${1:-${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}}"
BUCKET_NAME="${2:-${PROJECT_ID}.firebasestorage.app}"
ADMIN_EMAILS="${3:-}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: PROJECT_ID must be provided as 1st argument or via NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  exit 1
fi

# Sanitize project ID check
if [[ ! "${PROJECT_ID}" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: Invalid PROJECT_ID format '${PROJECT_ID}'."
  exit 1
fi

echo "==> Seeding initial data for project: ${PROJECT_ID}"
echo "    Target Bucket: gs://${BUCKET_NAME}"

# Locate profile source file
PROFILE_SOURCE=""
if [[ -f "src/data/profile.json" ]]; then
  PROFILE_SOURCE="src/data/profile.json"
elif [[ -f "src/data/profile.example.json" ]]; then
  PROFILE_SOURCE="src/data/profile.example.json"
else
  echo "Error: Neither src/data/profile.json nor src/data/profile.example.json exists."
  exit 1
fi

echo "==> Uploading ${PROFILE_SOURCE} to gs://${BUCKET_NAME}/cms/profile.json..."
if command -v gcloud &>/dev/null && gcloud storage objects describe "gs://${BUCKET_NAME}/cms/profile.json" &>/dev/null; then
  # Never overwrite content edited through /admin when an environment is re-provisioned.
  echo "    Already seeded, leaving it as is."
elif command -v gcloud &>/dev/null; then
  gcloud storage cp "${PROFILE_SOURCE}" "gs://${BUCKET_NAME}/cms/profile.json" --project="${PROJECT_ID}"
elif command -v gsutil &>/dev/null; then
  gsutil cp "${PROFILE_SOURCE}" "gs://${BUCKET_NAME}/cms/profile.json"
else
  echo "Warning: Neither gcloud nor gsutil CLI is installed. Skipping Storage upload."
  echo "Manual upload required: gsutil cp ${PROFILE_SOURCE} gs://${BUCKET_NAME}/cms/profile.json"
fi

# Optional admin emails: Terraform no longer creates admin documents, so this uses add-admin.sh
# (Firestore REST, touches only the admin fields).
if [[ -n "${ADMIN_EMAILS}" ]]; then
  IFS=',' read -ra EMAIL_ARRAY <<< "${ADMIN_EMAILS}"
  for raw_email in "${EMAIL_ARRAY[@]}"; do
    email=$(echo "${raw_email}" | tr -d '[:space:]')
    if [[ -n "${email}" ]]; then
      bash "$(dirname "${BASH_SOURCE[0]}")/add-admin.sh" "${PROJECT_ID}" "${email}" || echo "Warning: could not add ${email} as an admin."
    fi
  done
fi

echo "==> Data seeding complete."
