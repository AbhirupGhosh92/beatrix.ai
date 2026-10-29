#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy Cloud Functions & Firebase Security Rules
# Usage: ./scripts/deploy-backend.sh <PROJECT_ID>
# ==============================================================================

PROJECT_ID="${1:-${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: PROJECT_ID must be provided as 1st argument or via NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  exit 1
fi

echo "==> Deploying backend Cloud Functions & Firebase Security Rules to project: ${PROJECT_ID}"

# Step 1: Build functions package
echo "==> Building Cloud Functions typescript codebase..."
pnpm --prefix functions run build

# Step 2: Deploy functions and security rules via Firebase CLI
if command -v firebase &>/dev/null; then
  echo "==> Deploying via firebase-tools..."
  firebase deploy --project "${PROJECT_ID}" --only functions,firestore:rules,storage
elif command -v npx &>/dev/null; then
  echo "==> Deploying via npx firebase-tools..."
  npx firebase-tools deploy --project "${PROJECT_ID}" --only functions,firestore:rules,storage
else
  echo "Error: Neither firebase CLI nor npx is installed."
  exit 1
fi

echo "==> Backend deployment complete."
