#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Dev and prod are separate deployments, and this check keeps them that way:
#   - dev runs on pushes (merges) to main and by hand, and can only ever target the dev environment
#   - prod runs only when started by hand (the Run workflow button or scripts/deploy-prod.sh): no push,
#     pull request, schedule or workflow_run trigger, and it can only target the prod environment
#   - the shared stage logic (deploy-environment.yml) cannot be started on its own, and its concurrency
#     is per environment so a dev run never queues behind a prod run
# Run by scripts/check-scripts.sh. Usage: bash scripts/check-pipelines.sh [workflows-dir]
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${1:-${ROOT_DIR}/.github/workflows}"
DEV="${DIR}/deploy-dev.yml"
PROD="${DIR}/deploy-prod.yml"
SHARED="${DIR}/deploy-environment.yml"

echo "[step]     Check that dev and prod are separate deployments"
status=0
bad() { echo "[failed]   $1"; status=1; }

for f in "$DEV" "$PROD" "$SHARED"; do [[ -f "$f" ]] || bad "missing $f"; done
[[ "$status" -eq 0 ]] || exit 1

# Triggers are the top-level keys under `on:` (two-space indent), not words in comments or inputs.
triggers() { awk '/^on:/{on=1; next} on && /^[^ #]/{on=0} on && /^  [a-z_]+:/{gsub(/[: ]/,""); print}' "$1"; }

grep -qx 'push' < <(triggers "$DEV") || bad "deploy-dev.yml must run on pushes to main"
grep -qE '^\s+branches: \[main\]' "$DEV" || bad "deploy-dev.yml must be limited to main"
if grep -Eq 'environment: *prod' "$DEV"; then bad "deploy-dev.yml must never target the prod environment"; fi
grep -Eq '^\s+environment: dev$' "$DEV" || bad "deploy-dev.yml must pass environment: dev"

only="$(triggers "$PROD" | tr '\n' ' ')"
[[ "$only" == "workflow_dispatch " ]] || bad "deploy-prod.yml may only be started by hand (workflow_dispatch), found: ${only:-none}"
if grep -Eq 'environment: *dev( |$)' "$PROD"; then bad "deploy-prod.yml must never target the dev environment"; fi
grep -Eq '^\s+environment: prod$' "$PROD" || bad "deploy-prod.yml must pass environment: prod"

only="$(triggers "$SHARED" | tr '\n' ' ')"
[[ "$only" == "workflow_call " ]] || bad "deploy-environment.yml must only be called by the pipelines, found: ${only:-none}"
grep -q 'group: deploy-${{ inputs.environment }}' "$SHARED" || bad "deploy-environment.yml must use one concurrency group per environment"

# No other workflow may start the prod pipeline's stages.
others="$(grep -lE 'deploy-environment\.yml' "${DIR}"/*.yml 2>/dev/null | grep -vE 'deploy-(dev|prod|environment)\.yml' || true)"
[[ -z "$others" ]] || bad "only deploy-dev.yml and deploy-prod.yml may call deploy-environment.yml, also found in: ${others}"

if [[ "$status" -ne 0 ]]; then
  echo "[next]     see docs/DEPLOYMENT.md section 2: dev runs on merges to main, prod only by hand"
  exit 1
fi
echo "[result]   dev runs on merges to main, prod only by hand, and neither can target the other"
