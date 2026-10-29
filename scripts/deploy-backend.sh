#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy Cloud Functions, Firebase Security Rules and the App Hosting site from local source.
# The same command .github/workflows/deploy-environment.yml runs in CI.
# Usage: ./scripts/deploy-backend.sh <PROJECT_ID>
# ==============================================================================

PROJECT_ID="${1:-${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: PROJECT_ID must be provided as 1st argument or via NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  exit 1
fi

echo "==> Deploying functions, rules and App Hosting to project: ${PROJECT_ID}"

# Step 1: Build functions package
echo "==> Building Cloud Functions typescript codebase..."
pnpm --prefix functions install --frozen-lockfile
pnpm --prefix functions run build

# Step 2: Deploy via Firebase CLI
FIREBASE=(firebase)
command -v firebase &>/dev/null || FIREBASE=(npx --yes firebase-tools)
"${FIREBASE[@]}" deploy --project "${PROJECT_ID}" \
  --only functions,firestore:rules,storage,apphosting --non-interactive --force

# Step 3: Delete old function container images after a day (else they accumulate and bill)
"${FIREBASE[@]}" functions:artifacts:setpolicy --project "${PROJECT_ID}" --force

echo "==> Deployment complete."
