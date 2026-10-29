#!/usr/bin/env bash
set -uo pipefail

# ==============================================================================
# Check the manual (user-only) steps of an environment before automation runs.
# Usage: ./scripts/env-preflight.sh <env> [pre|post] [project_id]
#   pre  (default): before Terraform: tools, logins, GCP project, billing.
#   post          : after Terraform: Firebase Storage, Google sign-in, authorized domain.
# Exit codes: 0 = all done, 3 = the USER must do the steps printed under
# "ACTION REQUIRED" and then re-run, 1 = usage error.
#
# Agents: never do these steps yourself and never skip this script. Relay each
# ACTION REQUIRED step to the user, wait for them to say it is done, then re-run.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_NAME="${1:-}"
PHASE="${2:-pre}"
TFVARS_FILE="${ROOT_DIR}/terraform/environments/${ENV_NAME}.tfvars"

if [[ -z "${ENV_NAME}" || ! -f "${TFVARS_FILE}" ]]; then
  echo "Error: no terraform/environments/${ENV_NAME}.tfvars. Create it first (copy dev.tfvars)."
  exit 1
fi

PROJECT_ID="${3:-$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "${TFVARS_FILE}")}"
CONSOLE="https://console.firebase.google.com/project/${PROJECT_ID}"
ACTIONS=()

need() { ACTIONS+=("$1"); }

echo "==> Preflight (${PHASE}) for '${ENV_NAME}' (project ${PROJECT_ID})"

if [[ "${PHASE}" == "pre" ]]; then
  for tool in terraform gcloud firebase node pnpm gh; do
    command -v "${tool}" &>/dev/null || need "Install the '${tool}' CLI."
  done

  ACCOUNT="$(gcloud config get-value account 2>/dev/null)"
  [[ -n "${ACCOUNT}" ]] || need "Sign in to gcloud: gcloud auth login"
  gcloud auth application-default print-access-token &>/dev/null \
    || need "Create Application Default Credentials: gcloud auth application-default login"
  firebase projects:list &>/dev/null || need "Sign in to the Firebase CLI: firebase login"
  gh auth status &>/dev/null || need "Sign in to the GitHub CLI: gh auth login"

  STATE="$(gcloud projects describe "${PROJECT_ID}" --format='value(lifecycleState)' 2>/dev/null)"
  if [[ "${STATE}" != "ACTIVE" ]]; then
    need "Create the GCP project '${PROJECT_ID}' (or grant ${ACCOUNT:-your account} Owner on it): https://console.cloud.google.com/projectcreate"
  else
    BILLING="$(gcloud billing projects describe "${PROJECT_ID}" --format='value(billingEnabled)' 2>/dev/null)"
    [[ "${BILLING}" == "True" ]] \
      || need "Link a billing account to '${PROJECT_ID}': https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
  fi

elif [[ "${PHASE}" == "post" ]]; then
  TOKEN="$(gcloud auth print-access-token 2>/dev/null)"
  if [[ -z "${TOKEN}" ]]; then
    # Without a token every check below would fail and ask for steps that may be done already.
    need "Sign in to gcloud again (session expired or missing): gcloud auth login"
  else
    admin_api() {
      curl -sf -H "Authorization: Bearer ${TOKEN}" -H "x-goog-user-project: ${PROJECT_ID}" \
        "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/$1"
    }

    gcloud storage buckets describe "gs://${PROJECT_ID}.firebasestorage.app" &>/dev/null \
      || need "Set up Firebase Storage (click 'Get started', production mode, default location): ${CONSOLE}/storage"

    admin_api "defaultSupportedIdpConfigs/google.com" | grep -q '"enabled": *true' \
      || need "Enable the Google sign-in provider in Firebase Authentication (click 'Get started' first if asked): ${CONSOLE}/authentication/providers"

    DOMAIN="$(terraform -chdir="${ROOT_DIR}/terraform" output -raw apphosting_domain 2>/dev/null)"
    if [[ -n "${DOMAIN}" ]] && ! admin_api "config" | grep -q "\"${DOMAIN}\""; then
      need "Add '${DOMAIN}' to Authentication > Settings > Authorized domains: ${CONSOLE}/authentication/settings"
    fi
  fi

else
  echo "Error: phase must be 'pre' or 'post'."
  exit 1
fi

if [[ ${#ACTIONS[@]} -gt 0 ]]; then
  echo
  echo "ACTION REQUIRED (manual steps for the user, in order):"
  for i in "${!ACTIONS[@]}"; do
    echo "  $((i + 1)). ${ACTIONS[$i]}"
  done
  echo
  echo "Re-run './scripts/recreate-environment.sh ${ENV_NAME}' once they are done."
  exit 3
fi

echo "==> Preflight (${PHASE}) passed."
