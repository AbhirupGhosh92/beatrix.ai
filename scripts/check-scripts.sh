#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# The one script check used by every workflow (ci.yml, deploy-environment.yml, infra-check.yml):
# every shell script under scripts/ must parse, and the plan guard and branch-name hook tests
# must pass.
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

echo "[step]     Plan guard unit tests"
python3 -I -m unittest discover -s scripts/deploy -p 'test_*.py'
echo "[step]     Branch-name hook tests"
python3 -I -m unittest discover -s .claude/hooks -p 'test_*.py'
echo "[result]   deployment script checks passed"
