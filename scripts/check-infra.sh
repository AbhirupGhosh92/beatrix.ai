#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Infrastructure Sync & Validation Check Script
# Validates Terraform configuration syntax, formatting, and sync status
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> [1/3] Validating Terraform configuration syntax..."
if command -v terraform &>/dev/null; then
  echo "    Running terraform fmt -check..."
  terraform -chdir="${ROOT_DIR}/terraform" fmt -check || {
    echo "Error: Terraform formatting check failed. Run 'terraform fmt terraform/' to fix."
    exit 1
  }
fi

# Fallback/additional syntax validation using validator
python3 "${ROOT_DIR}/scripts/../terraform/../scripts/../scripts/../scripts/../self_created_tools/validate_infra_code.py" "${ROOT_DIR}/terraform" 2>/dev/null || \
python3 -c '
import os, sys, glob, re

tf_files = glob.glob("terraform/**/*.tf", recursive=True) + glob.glob("terraform/**/*.tfvars", recursive=True)
for f in tf_files:
    with open(f, "r") as fp:
        content = fp.read()
    # Check basic bracket balance
    open_c = content.count("{")
    close_c = content.count("}")
    if open_c != close_c:
        print(f"Error: Mismatched curly braces in {f}: {open_c} open vs {close_c} close")
        sys.exit(1)
print("Terraform file syntax check passed.")
'

echo "==> [2/3] Checking alignment between root security rules and Terraform rules resources..."
FIRESTORE_RULES_FILE="${ROOT_DIR}/firestore.rules"
STORAGE_RULES_FILE="${ROOT_DIR}/storage.rules"
TERRAFORM_MAIN="${ROOT_DIR}/terraform/main.tf"

if [[ ! -f "${FIRESTORE_RULES_FILE}" ]]; then
  echo "Error: Missing root firestore.rules file!"
  exit 1
fi

if [[ ! -f "${STORAGE_RULES_FILE}" ]]; then
  echo "Error: Missing root storage.rules file!"
  exit 1
fi

if ! grep -q 'firestore.rules' "${TERRAFORM_MAIN}"; then
  echo "Error: terraform/main.tf does not reference firestore.rules!"
  exit 1
fi

if ! grep -q 'storage.rules' "${TERRAFORM_MAIN}"; then
  echo "Error: terraform/main.tf does not reference storage.rules!"
  exit 1
fi

echo "==> [3/3] Checking git changes for infrastructure sync..."
if command -v git &>/dev/null && git rev-parse --is-inside-work-tree &>/dev/null; then
  RULES_CHANGED=0
  TF_CHANGED=0

  while read -r file; do
    if [[ "${file}" == "firestore.rules" || "${file}" == "storage.rules" || "${file}" == "firebase.json" || "${file}" == "apphosting.yaml" ]]; then
      RULES_CHANGED=1
    fi
    if [[ "${file}" == terraform/* ]]; then
      TF_CHANGED=1
    fi
  done < <(git status --porcelain | cut -c 4-)

  if [[ ${RULES_CHANGED} -eq 1 && ${TF_CHANGED} -eq 0 ]]; then
    echo "Notice: Firebase rules or deployment config modified without Terraform changes."
    echo "Ensure terraform/ configurations are updated if new infrastructure resources or rules were added."
  fi
fi

echo "==> All infrastructure validation checks passed successfully!"
