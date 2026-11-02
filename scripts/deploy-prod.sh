#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Start the PROD pipeline (the Deploy prod workflow, .github/workflows/deploy-prod.yml) from a
# terminal, or from an agent after the user said yes. Prod is never started by a push: this script
# and the "Run workflow" button are the only ways in.
#
# It does NOT deploy anything itself. It checks what it can locally (the same preflight as the
# workflow's Verify job), asks you to confirm, and starts the workflow with exactly the commit and
# version you chose. Terraform and GitHub Actions do the deploying, and the reviewers of the
# `prod-release` environment still approve once, after both plans.
#
# Usage: ./scripts/deploy-prod.sh <version> [--ref <commit|branch>] [--yes]
#
#   <version>   X.Y or X.Y.Z; the branch release/<version>, the tag v<version> and the GitHub release
#               are cut after a fully successful run
#   --ref       a commit (or a branch or tag) that is on main; default: main as it is on GitHub
#   --yes       skip the typed confirmation (an agent passes it only after the user's explicit yes)
#
# allow_destructive and redeploy_all are deliberately not offered here: use "Run workflow" in the
# GitHub UI for them, after reading docs/DEPLOYMENT.md.
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/deploy/log.sh"

VERSION=""
REF="main"
ASSUME_YES=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref) REF="${2:?--ref needs a value}"; shift 2 ;;
    --yes) ASSUME_YES=1; shift ;;
    -*)    fail "unknown option '$1'" "see the usage at the top of this script" ;;
    *)     if [[ -n "${VERSION}" ]]; then fail "more than one version given" "pass a single version such as 1.3"; fi
           VERSION="$1"; shift ;;
  esac
done
[[ -n "${VERSION}" ]] || fail "no version given" "run: ./scripts/deploy-prod.sh 1.3"

step_start "Check the commit and the version"
git fetch origin --tags --quiet || fail "could not fetch origin" "check your network and 'gh auth status'"

# `main` means main as it is on GitHub; anything else is resolved as given (a SHA, a branch, a tag).
if [[ "${REF}" == "main" ]]; then target="origin/main"; else target="${REF}"; fi
SHA="$(git rev-parse --verify --quiet "${target}^{commit}" || true)"
[[ -n "${SHA}" ]] || fail "'${REF}' is not a commit this clone knows" "push it, or give a commit SHA that is on main"
info "commit: ${SHA:0:7} $(git log -1 --format='%s' "${SHA}")"

# The same checks the workflow's Verify job makes: the commit is on main, release notes exist and the
# version is free. Failing here costs nothing; failing in the workflow costs a run.
bash "${ROOT_DIR}/scripts/deploy/check-prod-ref.sh" "${SHA}" "${VERSION}" origin

PROJECT_ID="$(awk -F'"' '/^[[:space:]]*project_id[[:space:]]*=/{print $2}' "${ROOT_DIR}/terraform/environments/prod.tfvars")"
[[ -n "${PROJECT_ID}" ]] || fail "project_id not found in prod.tfvars" "check terraform/environments/prod.tfvars"
result "ready to start prod: ${SHA:0:7} as ${VERSION} on ${PROJECT_ID}"
step_end

step_start "Confirm"
echo "This starts the PROD pipeline for project ${PROJECT_ID}: commit ${SHA:0:7} released as ${VERSION}." >&2
echo "Both plans are made first; nothing is applied until a prod-release reviewer approves. No App Hosting" >&2
echo "rollout is created: do that by hand afterwards." >&2
if [[ "${ASSUME_YES}" -ne 1 ]]; then
  answer=""
  read -r -p "Type 'prod' to start: " answer || true
  [[ "${answer}" == "prod" ]] || fail "not confirmed" "run again and type prod, or pass --yes"
fi
step_end

step_start "Start the Deploy prod workflow"
gh workflow run deploy-prod.yml --ref main -f "ref=${SHA}" -f "version=${VERSION}" -f confirm=prod
sleep "${RUN_LOOKUP_DELAY:-4}"
url="$(gh run list --workflow=deploy-prod.yml --limit 1 --json url --jq '.[0].url' 2>/dev/null || true)"
result "started: ${url:-see the Actions tab, workflow 'Deploy prod'}"
info "when both plans are ready the run waits for a prod-release reviewer; read the plans before approving"
step_end
