#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Builds the Cloud Functions source that Terraform zips and deploys (terraform/functions.tf):
# compiles functions/ and stages the compiled lib/ plus package.json, pnpm-lock.yaml and
# pnpm-workspace.yaml into terraform/.build/functions-src with fixed file times, so identical code
# always gives an identical zip (and therefore no new function revision).
# Run before `terraform plan`. Usage: bash scripts/build-functions.sh
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=deploy/log.sh
source "${ROOT_DIR}/scripts/deploy/log.sh"

STAGE="${ROOT_DIR}/terraform/.build/functions-src"

step_start "Build the Cloud Functions source"
info "installing and compiling functions/ (pnpm, frozen lockfile)"
pnpm --prefix "${ROOT_DIR}/functions" install --frozen-lockfile
pnpm --prefix "${ROOT_DIR}/functions" run build

[[ -f "${ROOT_DIR}/functions/lib/index.js" ]] || fail "functions/lib/index.js was not produced" "check the TypeScript build output above"

rm -rf "${STAGE}"
mkdir -p "${STAGE}"
cp -R "${ROOT_DIR}/functions/lib" "${STAGE}/lib"
cp "${ROOT_DIR}/functions/package.json" "${ROOT_DIR}/functions/pnpm-lock.yaml" "${ROOT_DIR}/functions/pnpm-workspace.yaml" "${STAGE}/"

# Fixed times so the zip does not change when nothing else did.
find "${STAGE}" -exec touch -t 198001010000 {} +

result "staged $(find "${STAGE}" -type f | wc -l | tr -d ' ') files in terraform/.build/functions-src"
step_end
