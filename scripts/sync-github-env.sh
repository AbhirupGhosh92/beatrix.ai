#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Point a GitHub Actions environment at its GCP project, so .github/workflows/deploy.yml
# can deploy to it. Reads the Terraform outputs of the environment initialized in terraform/.
# Usage: ./scripts/sync-github-env.sh <env>
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_NAME="${1:?Usage: sync-github-env.sh <env>}"

tf_out() { terraform -chdir="${ROOT_DIR}/terraform" output -raw "$1"; }

PROJECT_ID="$(tf_out project_id)"

echo "==> Configuring GitHub environment '${ENV_NAME}' for project ${PROJECT_ID}..."
# Create the environment only when it does not exist: a PUT on an existing environment resets
# its protection rules (required reviewers, deployment branch policy) set up in the GitHub UI.
if gh api --silent "repos/{owner}/{repo}/environments/${ENV_NAME}" 2>/dev/null; then
  echo "    Environment already exists, keeping its protection rules."
else
  gh api --silent -X PUT "repos/{owner}/{repo}/environments/${ENV_NAME}"
fi

gh variable set GCP_PROJECT_ID --env "${ENV_NAME}" --body "${PROJECT_ID}"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --env "${ENV_NAME}" --body "$(tf_out workload_identity_provider)"
gh variable set GCP_DEPLOYER_SERVICE_ACCOUNT --env "${ENV_NAME}" --body "$(tf_out deployer_service_account_email)"
gh variable set TF_STATE_BUCKET --env "${ENV_NAME}" --body "${PROJECT_ID}-tfstate"

echo "==> GitHub environment '${ENV_NAME}' is ready."
