#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# The pipeline has two Terraform configurations: stage 1 (terraform/) and stage 2
# (terraform/functions/). Each reads its own tfvars, so the values they must agree on are checked
# here: the project and the environment name of each environment, and that nothing in stage 1 still
# declares the function resources. Run by scripts/check-scripts.sh.
# Usage: bash scripts/check-terraform-stages.sh
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[step]     Check that both Terraform stages agree"
status=0
for env in dev prod; do
  one="terraform/environments/${env}.tfvars"
  two="terraform/functions/environments/${env}.tfvars"
  for f in "$one" "$two"; do
    [[ -f "$f" ]] || { echo "[failed]   missing $f"; status=1; }
  done
  [[ -f "$one" && -f "$two" ]] || continue
  for key in project_id environment region; do
    a="$(awk -F'"' -v k="$key" '$1 ~ "^"k"[[:space:]]*=" {print $2}' "$one")"
    b="$(awk -F'"' -v k="$key" '$1 ~ "^"k"[[:space:]]*=" {print $2}' "$two")"
    if [[ -n "$a" && "$a" != "$b" ]]; then
      echo "[failed]   ${key} differs for ${env}: '${a}' in ${one}, '${b}' in ${two}"
      status=1
    fi
  done
done

if grep -nE '^resource "google_(cloudfunctions2_function|cloud_run_v2_service_iam_binding|storage_bucket_object)"|google_storage_bucket" "functions_src"' terraform/*.tf; then
  echo "[failed]   stage 1 (terraform/) must not declare the Cloud Functions resources; they live in terraform/functions/"
  status=1
fi

if [[ "$status" -ne 0 ]]; then
  echo "[next]     keep terraform/environments/<env>.tfvars and terraform/functions/environments/<env>.tfvars in step"
  exit 1
fi
echo "[result]   both stages agree on project, environment and region"
