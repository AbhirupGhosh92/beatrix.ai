#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy Cloud Functions, Firebase Security Rules, the App Hosting site and the Python AI service
# (Cloud Run) from local source.
# The same script .github/workflows/deploy-environment.yml runs in CI.
#
# Usage: ./scripts/deploy-backend.sh <PROJECT_ID> [--components functions,rules,apphosting,python]
#                                    [--region <region>] [--allow-destructive]
#
#   --components         comma-separated list of what to deploy; default: all four.
#                        Anything not listed is not touched at all.
#   --region             Cloud Run region for the python component (default us-central1).
#   --allow-destructive  pass --force to the Firebase CLI, which then also DELETES deployed
#                        Cloud Functions that no longer exist in the source. Without it the CLI
#                        refuses (non-interactive) instead of deleting. Never used by default.
# ==============================================================================

source "$(dirname "${BASH_SOURCE[0]}")/deploy/log.sh"

PROJECT_ID=""
COMPONENTS="functions,rules,apphosting,python"
REGION="us-central1"
ALLOW_DESTRUCTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --components)        COMPONENTS="${2:?--components needs a value}"; shift 2 ;;
    --region)            REGION="${2:?--region needs a value}"; shift 2 ;;
    --allow-destructive) ALLOW_DESTRUCTIVE=1; shift ;;
    -*)                  fail "unknown option '$1'" "see the usage at the top of this script" ;;
    *)                   PROJECT_ID="$1"; shift ;;
  esac
done
PROJECT_ID="${PROJECT_ID:-${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}}"

if [[ -z "${PROJECT_ID}" ]]; then
  fail "PROJECT_ID must be provided as 1st argument or via NEXT_PUBLIC_FIREBASE_PROJECT_ID." "pass the project id, e.g. beatrix-ai-dev"
fi

ONLY=()
DEPLOY_FUNCTIONS=0
DEPLOY_PYTHON=0
IFS=',' read -ra WANTED <<< "${COMPONENTS}"
for component in "${WANTED[@]}"; do
  case "${component// /}" in
    functions)  ONLY+=("functions"); DEPLOY_FUNCTIONS=1 ;;
    rules)      ONLY+=("firestore:rules" "storage") ;;
    apphosting) ONLY+=("apphosting") ;;
    python)     DEPLOY_PYTHON=1 ;;
    "")         ;;
    *)          fail "unknown component '${component}'" "use functions, rules, apphosting or python" ;;
  esac
done

if [[ ${#ONLY[@]} -eq 0 && "${DEPLOY_PYTHON}" -eq 0 ]]; then
  decision "deploy" "no components selected for ${PROJECT_ID}, nothing is deployed"
  exit 0
fi

step_start "Deploy components"
info "project: ${PROJECT_ID}"
info "components: ${COMPONENTS} (anything not listed is not touched)"

# Step 1: build the functions package (only when functions are being deployed)
if [[ "${DEPLOY_FUNCTIONS}" -eq 1 ]]; then
  decision "build functions" "functions are being deployed, building them first"
  pnpm --prefix functions install --frozen-lockfile
  pnpm --prefix functions run build
fi

# Step 2: deploy only what was asked for
FIREBASE=(firebase)
command -v firebase &>/dev/null || FIREBASE=(npx --yes firebase-tools)

DEPLOY_FLAGS=(--non-interactive)
if [[ "${ALLOW_DESTRUCTIVE}" -eq 1 ]]; then
  decision "--force" "--allow-destructive is set, so Cloud Functions removed from the source WILL BE DELETED"
  DEPLOY_FLAGS+=(--force)
fi

if [[ ${#ONLY[@]} -gt 0 ]]; then
  ONLY_ARG="$(IFS=','; echo "${ONLY[*]}")"
  "${FIREBASE[@]}" deploy --project "${PROJECT_ID}" --only "${ONLY_ARG}" "${DEPLOY_FLAGS[@]}"
fi

# Step 3: delete old function container images after a day (else they accumulate and bill).
# This only sets an Artifact Registry cleanup policy; it does not change any function.
if [[ "${DEPLOY_FUNCTIONS}" -eq 1 ]]; then
  "${FIREBASE[@]}" functions:artifacts:setpolicy --project "${PROJECT_ID}" --force
fi

# Step 4: the Python AI service on Cloud Run. Private (no unauthenticated access); only the App
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
