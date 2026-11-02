#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# The one script check used by every workflow (ci.yml, deploy-environment.yml, infra-check.yml):
# every shell script under scripts/ must parse, the Terraform function list must match the exports
# of functions/src/index.ts, both Terraform stages must agree on project and environment, dev and prod must stay separate pipelines, and the plan guard and branch-name hook tests must pass.
# Run from anywhere: bash scripts/check-scripts.sh
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[step]     Check the deployment scripts"
count=0
while IFS= read -r -d '' f; do
  bash -n "$f"
  echo "[info]     syntax ok: $f"
  count=$((count + 1))
done < <(find scripts -name '*.sh' -print0 | LC_ALL=C sort -z)
echo "[result]   ${count} shell scripts parse"

bash scripts/check-functions.sh
bash scripts/check-terraform-stages.sh
bash scripts/check-pipelines.sh
echo "[step]     Plan guard unit tests"
python3 -I -m unittest discover -s scripts/deploy -p 'test_*.py'
echo "[step]     Branch-name hook tests"
python3 -I -m unittest discover -s .claude/hooks -p 'test_*.py'
echo "[result]   deployment script checks passed"
