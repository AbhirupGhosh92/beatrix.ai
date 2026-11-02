#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Add (or re-enable) an admin: creates or updates the Firestore document allowed_emails/<email> with
# admin, allowed and role set. Terraform no longer fills in people's data, so this is how the first
# admin is made; afterwards manage people at /admin/access.
#
# Usage: ./scripts/add-admin.sh <env|project-id> <email>
#   <env>         dev or prod (the project comes from terraform/environments/<env>.tfvars), or a project id
#   <email>       the Google account that signs in
#
# It touches only the admin, allowed and role fields (a Firestore update mask), so anything else on the
# document, for example lastLoginAt, is left alone. Needs `gcloud auth login` as someone with Firestore
# write access to the project. Nothing is sent anywhere except that project's Firestore API.
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/deploy/log.sh"

TARGET="${1:-}"
RAW_EMAIL="${2:-}"
[[ -n "${TARGET}" && -n "${RAW_EMAIL}" ]] || fail "usage: add-admin.sh <env|project-id> <email>" "for example: ./scripts/add-admin.sh dev you@example.com"

step_start "Add an admin"
if [[ -f "${ROOT_DIR}/terraform/environments/${TARGET}.tfvars" ]]; then
  PROJECT_ID="$(awk -F'"' '/^[[:space:]]*project_id[[:space:]]*=/{print $2}' "${ROOT_DIR}/terraform/environments/${TARGET}.tfvars")"
elif [[ "${TARGET}" =~ ^[a-z][a-z0-9-]{4,}$ ]]; then
  PROJECT_ID="${TARGET}"
else
  fail "'${TARGET}' is neither an environment (dev, prod) nor a project id" "use dev, prod or the GCP project id"
fi
[[ -n "${PROJECT_ID}" ]] || fail "could not read project_id for '${TARGET}'" "check terraform/environments/${TARGET}.tfvars"

EMAIL="$(tr '[:upper:]' '[:lower:]' <<<"${RAW_EMAIL}" | tr -d '[:space:]')"
if [[ ! "${EMAIL}" =~ ^[^@/?#%]+@[^@/?#%]+\.[^@/?#%]+$ ]]; then
  fail "'${RAW_EMAIL}' is not an email address" "pass the Google account that will sign in"
fi
info "project: ${PROJECT_ID}; admin: ${EMAIL}"

TOKEN="${FIRESTORE_TOKEN:-$(gcloud auth print-access-token 2>/dev/null || true)}"
[[ -n "${TOKEN}" ]] || fail "no access token" "run: gcloud auth login"

BASE="${FIRESTORE_BASE:-https://firestore.googleapis.com}"
ID="$(python3 -I -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "${EMAIL}")"
URL="${BASE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/allowed_emails/${ID}"
URL+="?updateMask.fieldPaths=admin&updateMask.fieldPaths=allowed&updateMask.fieldPaths=role"
BODY='{"fields":{"admin":{"booleanValue":true},"allowed":{"booleanValue":true},"role":{"stringValue":"admin"}}}'

OUT="$(mktemp)"
trap 'rm -f "${OUT}"' EXIT
code="$(curl -sS -o "${OUT}" -w '%{http_code}' -X PATCH \
  -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' -d "${BODY}" "${URL}" || true)"
if [[ "${code}" != "200" ]]; then
  fail "Firestore answered HTTP ${code:-none} for ${PROJECT_ID}" "check that you are signed in as someone who can write Firestore there (gcloud auth login); response: $(head -c 300 "${OUT}")"
fi
result "${EMAIL} is an admin of ${PROJECT_ID}; they can sign in and open /admin"
step_end
