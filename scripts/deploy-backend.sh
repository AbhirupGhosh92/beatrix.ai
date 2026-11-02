#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy the App Hosting site (dev) and the Python AI service (Cloud Run) from local source.
# Cloud Functions and the security rules are NOT deployed here: Terraform owns them (see
# terraform/functions/ and scripts/deploy-functions-dev.sh).
# The same script .github/workflows/deploy-environment.yml runs in CI.
#
# Usage: ./scripts/deploy-backend.sh <PROJECT_ID> [--components apphosting,python] [--region <region>]
#
#   --components   comma-separated list of what to deploy; default: both.
#                  Anything not listed is not touched at all.
#   --region       Cloud Run region for the python component (default us-central1).
# ==============================================================================

source "$(dirname "${BASH_SOURCE[0]}")/deploy/log.sh"

PROJECT_ID=""
COMPONENTS="apphosting,python"
REGION="us-central1"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --components)        COMPONENTS="${2:?--components needs a value}"; shift 2 ;;
    --region)            REGION="${2:?--region needs a value}"; shift 2 ;;
    -*)                  fail "unknown option '$1'" "see the usage at the top of this script" ;;
    *)                   PROJECT_ID="$1"; shift ;;
  esac
done
PROJECT_ID="${PROJECT_ID:-${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}}"

if [[ -z "${PROJECT_ID}" ]]; then
  fail "PROJECT_ID must be provided as 1st argument or via NEXT_PUBLIC_FIREBASE_PROJECT_ID." "pass the project id, e.g. beatrix-ai-dev"
fi

ONLY=()
DEPLOY_PYTHON=0
IFS=',' read -ra WANTED <<< "${COMPONENTS}"
for component in "${WANTED[@]}"; do
  case "${component// /}" in
    functions|rules) fail "'${component}' is deployed by Terraform, not by this script" "change terraform/ or functions/ and apply the reviewed plan (docs/DEPLOYMENT.md); on dev, scripts/deploy-functions-dev.sh deploys the functions alone" ;;
    apphosting) ONLY+=("apphosting") ;;
    python)     DEPLOY_PYTHON=1 ;;
    "")         ;;
    *)          fail "unknown component '${component}'" "use apphosting or python" ;;
  esac
done

if [[ ${#ONLY[@]} -eq 0 && "${DEPLOY_PYTHON}" -eq 0 ]]; then
  decision "deploy" "no components selected for ${PROJECT_ID}, nothing is deployed"
  exit 0
fi

step_start "Deploy components"
info "project: ${PROJECT_ID}"
info "components: ${COMPONENTS} (anything not listed is not touched)"

# Step 1: deploy App Hosting with the Firebase CLI (dev only; prod rollouts are created by hand)
FIREBASE=(firebase)
command -v firebase &>/dev/null || FIREBASE=(npx --yes firebase-tools)

if [[ ${#ONLY[@]} -gt 0 ]]; then
  ONLY_ARG="$(IFS=','; echo "${ONLY[*]}")"
  "${FIREBASE[@]}" deploy --project "${PROJECT_ID}" --only "${ONLY_ARG}" --non-interactive
fi

# Step 2: the Python AI service on Cloud Run. Private (no unauthenticated access); only the App
# Hosting service account may invoke it. The secret is mounted by reference only when it already
# has a version (the value is set by hand, never by this script), and its value is never read.
if [[ "${DEPLOY_PYTHON}" -eq 1 ]]; then
  SERVICE="beatrix-ai"
  RUNTIME_SA="python-ai-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
  CALLER_SA="firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com"
  RUN_ARGS=(--project "${PROJECT_ID}" --region "${REGION}" --source ai_backend --no-allow-unauthenticated
            --service-account "${RUNTIME_SA}" --min-instances 0 --max-instances 2 --timeout 3600 --quiet)
  if [[ -n "$(gcloud secrets versions list model-api-key --project "${PROJECT_ID}" --filter='state=ENABLED' --limit=1 --format='value(name)' 2>/dev/null)" ]]; then
    decision "model API key" "secret model-api-key has a version, mounting it as MODEL_API_KEY"
    RUN_ARGS+=(--set-secrets "MODEL_API_KEY=model-api-key:latest")
  else
    decision "model API key" "secret model-api-key has no version yet, deploying without it (AI disabled)"
  fi
  gcloud run deploy "${SERVICE}" "${RUN_ARGS[@]}"
  gcloud run services add-iam-policy-binding "${SERVICE}" --project "${PROJECT_ID}" --region "${REGION}" \
    --member "serviceAccount:${CALLER_SA}" --role roles/run.invoker --quiet >/dev/null
fi

result "deployment of [${COMPONENTS}] to ${PROJECT_ID} complete"
step_end
