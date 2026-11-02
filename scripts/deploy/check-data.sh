#!/usr/bin/env bash
set -uo pipefail

# ==============================================================================
# Terraform creates infrastructure only; people's data is filled in by the owner. This checks for the
# one piece nobody can work without, an admin user, and SAYS SO when it is missing. It never fails
# the run (always exit 0): a missing admin is a to-do, not a broken deploy.
#
# Usage: check-data.sh <project-id> <env>
# In GitHub Actions the notice is a warning annotation and a line in the run summary.
# ==============================================================================

source "$(dirname "${BASH_SOURCE[0]}")/log.sh"

PROJECT_ID="${1:?usage: check-data.sh <project-id> <env>}"
ENV_NAME="${2:?usage: check-data.sh <project-id> <env>}"

step_start "Check that the data to fill in exists"
TOKEN="${FIRESTORE_TOKEN:-$(gcloud auth print-access-token 2>/dev/null || true)}"
if [[ -z "${TOKEN}" ]]; then
  info "no access token, so the admin check was skipped"
  step_end
  exit 0
fi

BASE="${FIRESTORE_BASE:-https://firestore.googleapis.com}"
OUT="$(mktemp)"
trap 'rm -f "${OUT}"' EXIT
code="$(curl -sS -o "${OUT}" -w '%{http_code}' -H "Authorization: Bearer ${TOKEN}" \
  "${BASE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/allowed_emails?pageSize=1" 2>/dev/null || true)"

if [[ "${code}" != "200" ]]; then
  info "could not read allowed_emails (HTTP ${code:-none}), so the admin check was skipped"
  step_end
  exit 0
fi

if jq -e '(.documents // []) | length > 0' "${OUT}" >/dev/null 2>&1; then
  decision "admin" "at least one user exists in allowed_emails"
  result "nothing to fill in"
else
  msg="No admin user exists on ${ENV_NAME} (${PROJECT_ID}), so nobody can open /admin. Add one: ./scripts/add-admin.sh ${ENV_NAME} you@example.com"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    echo "::warning title=Data to fill::${msg}"
    if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
      printf '\n### Data to fill in\n\n%s\n\n' "${msg}" >> "${GITHUB_STEP_SUMMARY}"
    fi
  else
    echo "[warning]  ${msg}" >&2
  fi
  result "reported: no admin user yet"
fi
step_end
exit 0
