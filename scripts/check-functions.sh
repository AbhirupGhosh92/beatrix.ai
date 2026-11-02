#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Terraform owns the Cloud Functions, so the list in terraform/functions.tf (`function_names`) must
# equal the functions exported by functions/src/index.ts, in both directions. A function that is
# exported but not listed would never be deployed; one that is listed but not exported would fail
# the deploy. Run by scripts/check-scripts.sh (CI, Verify and infra-check).
# Usage: bash scripts/check-functions.sh
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[step]     Check that Terraform lists every exported Cloud Function"
python3 -I - <<'PY'
import re
import sys

index = open("functions/src/index.ts", encoding="utf-8").read()
exported = set(re.findall(r"^export const (\w+)\s*=", index, re.M))
for block in re.findall(r"^export\s*\{([^}]*)\}", index, re.M):
    for name in block.split(","):
        name = name.strip().split(" as ")[-1].strip()
        if name:
            exported.add(name)

tf = open("terraform/functions.tf", encoding="utf-8").read()
match = re.search(r"function_names\s*=\s*\[([^\]]*)\]", tf)
if not match:
    sys.exit("[failed]   terraform/functions.tf has no function_names list")
listed = set(re.findall(r'"([^"]+)"', match.group(1)))

missing = sorted(exported - listed)
extra = sorted(listed - exported)
if missing or extra:
    if missing:
        print("[failed]   exported by functions/src/index.ts but missing from terraform/functions.tf: " + ", ".join(missing))
    if extra:
        print("[failed]   listed in terraform/functions.tf but not exported by functions/src/index.ts: " + ", ".join(extra))
    print("[next]     make function_names in terraform/functions.tf equal the exports of functions/src/index.ts")
    sys.exit(1)
print(f"[result]   {len(exported)} exported functions match function_names")
PY
