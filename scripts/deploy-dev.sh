#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Start the DEV pipeline (the Deploy dev workflow) by hand for a ref, for example to try a branch.
# You do not need this for main: every push (merge) to main deploys dev by itself.
#
# Usage: ./scripts/deploy-dev.sh [--ref <branch|tag|commit>]     default: the current branch
# The ref must be pushed (the workflow deploys what is on GitHub). allow_destructive and redeploy_all
# are not offered here; use "Run workflow" in the GitHub UI for them.
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/deploy/log.sh"

REF="$(git rev-parse --abbrev-ref HEAD)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref) REF="${2:?--ref needs a value}"; shift 2 ;;
    *)     fail "unknown option '$1'" "see the usage at the top of this script" ;;
  esac
done

step_start "Start the Deploy dev workflow"
git fetch origin --quiet || fail "could not fetch origin" "check your network and 'gh auth status'"
if ! git rev-parse --verify --quiet "origin/${REF}^{commit}" >/dev/null && ! git rev-parse --verify --quiet "${REF}^{commit}" >/dev/null; then
  fail "'${REF}' is not a known ref" "push the branch first"
fi
if git rev-parse --verify --quiet "origin/${REF}^{commit}" >/dev/null && [[ "$(git rev-parse "${REF}^{commit}" 2>/dev/null || true)" != "" ]] \
   && [[ "$(git rev-parse "${REF}^{commit}")" != "$(git rev-parse "origin/${REF}^{commit}")" ]]; then
  fail "'${REF}' differs from origin/${REF}" "push your commits first: the workflow deploys what is on GitHub"
fi
gh workflow run deploy-dev.yml --ref main -f "ref=${REF}"
sleep "${RUN_LOOKUP_DELAY:-4}"
url="$(gh run list --workflow=deploy-dev.yml --limit 1 --json url --jq '.[0].url' 2>/dev/null || true)"
result "started: ${url:-see the Actions tab, workflow 'Deploy dev'}"
step_end
