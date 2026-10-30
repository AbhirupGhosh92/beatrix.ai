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

source "$(dirname "${BASH_SOURCE[0]}")/deploy/log.sh"

PROJECT_ID=""
COMPONENTS="functions,rules,apphosting"
ALLOW_DESTRUCTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --components)        COMPONENTS="${2:?--components needs a value}"; shift 2 ;;
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
IFS=',' read -ra WANTED <<< "${COMPONENTS}"
for component in "${WANTED[@]}"; do
  case "${component// /}" in
    functions)  ONLY+=("functions"); DEPLOY_FUNCTIONS=1 ;;
    rules)      ONLY+=("firestore:rules" "storage") ;;
    apphosting) ONLY+=("apphosting") ;;
    "")         ;;
    *)          fail "unknown component '${component}'" "use functions, rules or apphosting" ;;
  esac
done

if [[ ${#ONLY[@]} -eq 0 ]]; then
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

ONLY_ARG="$(IFS=','; echo "${ONLY[*]}")"
"${FIREBASE[@]}" deploy --project "${PROJECT_ID}" --only "${ONLY_ARG}" "${DEPLOY_FLAGS[@]}"

# Step 3: delete old function container images after a day (else they accumulate and bill).
# This only sets an Artifact Registry cleanup policy; it does not change any function.
if [[ "${DEPLOY_FUNCTIONS}" -eq 1 ]]; then
  "${FIREBASE[@]}" functions:artifacts:setpolicy --project "${PROJECT_ID}" --force
fi

result "deployment of [${COMPONENTS}] to ${PROJECT_ID} complete"
step_end
