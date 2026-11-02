#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy the Cloud Functions to the DEV project alone, through Terraform: this is stage 2 of the
# pipeline (terraform/functions/), which holds only the function resources (source bucket and object,
# the functions, invoker bindings). Builds the functions, plans that configuration, runs the plan
# guard, shows the plan, asks for confirmation and applies exactly that saved plan. No resource
# targeting is needed because stage 2 is its own configuration with its own state.
#
# Usage: ./scripts/deploy-functions-dev.sh [--yes] [--project <dev project id>]
#
#   --yes       do not ask for confirmation (the plan is still shown and guarded)
#   --project   must equal project_id in terraform/environments/dev.tfvars; any other project
#               (prod included) is refused before anything is planned or applied
#
# Prod changes only through the reviewed, saved plans of the Deploy prod workflow.
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/deploy/log.sh"

TFVARS="${ROOT_DIR}/terraform/environments/dev.tfvars"
STAGE2_TFVARS="${ROOT_DIR}/terraform/functions/environments/dev.tfvars"
ASSUME_YES=0
REQUESTED_PROJECT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)     ASSUME_YES=1; shift ;;
    --project) REQUESTED_PROJECT="${2:?--project needs a value}"; shift 2 ;;
    *)         fail "unknown option '$1'" "see the usage at the top of this script" ;;
  esac
done

step_start "Check the target is the dev project"
[[ -f "${TFVARS}" ]] || fail "terraform/environments/dev.tfvars is missing" "restore it from git"
DEV_PROJECT="$(awk -F'"' '/^project_id[[:space:]]*=/{print $2}' "${TFVARS}")"
[[ -n "${DEV_PROJECT}" ]] || fail "project_id not found in dev.tfvars" "check terraform/environments/dev.tfvars"
if [[ -n "${REQUESTED_PROJECT}" && "${REQUESTED_PROJECT}" != "${DEV_PROJECT}" ]]; then
  fail "refusing to deploy functions to '${REQUESTED_PROJECT}': this script only changes the dev project (${DEV_PROJECT})" "prod changes only through the Deploy workflow (docs/DEPLOYMENT.md)"
fi
info "project: ${DEV_PROJECT}"
result "target is the dev project"
step_end

bash "${ROOT_DIR}/scripts/build-functions.sh"

step_start "Plan the Cloud Functions (stage 2)"
PLAN_DIR="$(mktemp -d)"
trap 'rm -rf "${PLAN_DIR}"' EXIT
cd "${ROOT_DIR}/terraform/functions"
terraform init -input=false -reconfigure -backend-config="bucket=${DEV_PROJECT}-tfstate" >/dev/null
terraform plan -input=false -lock-timeout=5m -var-file="${STAGE2_TFVARS}" -out="${PLAN_DIR}/tfplan"
terraform show -json "${PLAN_DIR}/tfplan" > "${PLAN_DIR}/plan.json"
result "plan saved for this run only"
step_end

step_start "Plan guard (functions must not be deleted or replaced)"
python3 -I "${ROOT_DIR}/scripts/deploy/plan_guard.py" "${PLAN_DIR}/plan.json"
result "plan guard passed"
step_end

step_start "Apply the saved plan to ${DEV_PROJECT}"
if [[ "${ASSUME_YES}" -ne 1 ]]; then
  answer=""
  read -r -p "Apply this plan to ${DEV_PROJECT}? Type 'dev' to continue: " answer || true
  [[ "${answer}" == "dev" ]] || fail "not confirmed" "run again and type dev, or pass --yes"
fi
terraform apply -input=false -lock-timeout=5m "${PLAN_DIR}/tfplan"
result "functions applied to ${DEV_PROJECT}"
info "Terraform owns the Cloud Functions: change them through terraform/functions/functions.tf and the Deploy dev or Deploy prod workflow, not with the Firebase CLI."
step_end
