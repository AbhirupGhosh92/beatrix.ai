#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy Cloud Functions, Firebase Security Rules and the App Hosting site from local source.
# The same script .github/workflows/deploy-environment.yml runs in CI.
#
# Usage: ./scripts/deploy-backend.sh <PROJECT_ID> [--components functions,rules,apphosting]
#                                    [--allow-destructive]
#
#   --components         comma-separated list of what to deploy; default: all three.
#                        Anything not listed is not touched at all.
#   --allow-destructive  pass --force to the Firebase CLI, which then also DELETES deployed
#                        Cloud Functions that no longer exist in the source. Without it the CLI
#                        refuses (non-interactive) instead of deleting. Never used by default.
# ==============================================================================

PROJECT_ID=""
COMPONENTS="functions,rules,apphosting"
ALLOW_DESTRUCTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --components)        COMPONENTS="${2:?--components needs a value}"; shift 2 ;;
    --allow-destructive) ALLOW_DESTRUCTIVE=1; shift ;;
    -*)                  echo "Error: unknown option '$1'"; exit 1 ;;
    *)                   PROJECT_ID="$1"; shift ;;
  esac
done
PROJECT_ID="${PROJECT_ID:-${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: PROJECT_ID must be provided as 1st argument or via NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  exit 1
fi

ONLY=()
DEPLOY_FUNCTIONS=0
IFS=',' read -ra WANTED <<< "${COMPONENTS}"
for component in "${WANTED[@]}"; do
  case "${component// /}" in
    functions)  ONLY+=("functions"); DEPLOY_FUNCTIONS=1 ;;
    rules)      ONLY+=("firestore:rules" "storage") ;;
    apphosting) ONLY+=("apphosting") ;;
    "")         ;;
    *)          echo "Error: unknown component '${component}' (functions | rules | apphosting)"; exit 1 ;;
  esac
done

if [[ ${#ONLY[@]} -eq 0 ]]; then
  echo "==> No components selected for ${PROJECT_ID}: nothing is deployed."
  exit 0
fi

echo "==> Deploying [${COMPONENTS}] to project: ${PROJECT_ID}"

# Step 1: build the functions package (only when functions are being deployed)
if [[ "${DEPLOY_FUNCTIONS}" -eq 1 ]]; then
  echo "==> Building Cloud Functions typescript codebase..."
  pnpm --prefix functions install --frozen-lockfile
  pnpm --prefix functions run build
fi

# Step 2: deploy only what was asked for
FIREBASE=(firebase)
command -v firebase &>/dev/null || FIREBASE=(npx --yes firebase-tools)

DEPLOY_FLAGS=(--non-interactive)
if [[ "${ALLOW_DESTRUCTIVE}" -eq 1 ]]; then
  echo "==> WARNING: --allow-destructive is set, so removed Cloud Functions will be deleted."
  DEPLOY_FLAGS+=(--force)
fi

ONLY_ARG="$(IFS=','; echo "${ONLY[*]}")"
"${FIREBASE[@]}" deploy --project "${PROJECT_ID}" --only "${ONLY_ARG}" "${DEPLOY_FLAGS[@]}"

# Step 3: delete old function container images after a day (else they accumulate and bill).
# This only sets an Artifact Registry cleanup policy; it does not change any function.
if [[ "${DEPLOY_FUNCTIONS}" -eq 1 ]]; then
  "${FIREBASE[@]}" functions:artifacts:setpolicy --project "${PROJECT_ID}" --force
fi

echo "==> Deployment complete."
