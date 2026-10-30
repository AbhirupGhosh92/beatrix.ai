#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Post-deploy checks against the deployed site. Read-only: only GET requests, no sign-in,
# nothing is written. Fails the run if the site is not serving correctly.
#
# Usage: smoke-test.sh <site_url>
# ==============================================================================

SITE_URL="${1:?Usage: smoke-test.sh <site_url>}"
SITE_URL="${SITE_URL%/}"
fail=0

check() { echo "  ok   $1"; }
bad()   { echo "::error::$1"; fail=1; }

# A new App Hosting rollout can take a short while to start serving.
fetch() {
  curl --silent --show-error --location --max-time 30 \
    --retry 6 --retry-delay 10 --retry-all-errors "$@"
}

echo "==> Smoke test: ${SITE_URL}"

code="$(fetch --output /tmp/smoke-home.html --write-out '%{http_code}' "${SITE_URL}/" || true)"
if [[ "${code}" == "200" ]]; then check "GET / returns 200"; else bad "GET / returned ${code:-no response}, expected 200"; fi

if grep -qi '<html' /tmp/smoke-home.html 2>/dev/null; then check "home page is HTML"; else bad "home page did not return HTML"; fi

# The admin API must refuse requests without a sign-in token (it answers 401, never data).
code="$(fetch --output /dev/null --write-out '%{http_code}' "${SITE_URL}/api/admin/cms" || true)"
if [[ "${code}" == "401" ]]; then check "unauthenticated /api/admin/cms is refused (401)"; else bad "GET /api/admin/cms without a token returned ${code:-no response}, expected 401"; fi

if [[ "${fail}" -ne 0 ]]; then
  echo "==> Smoke test FAILED"
  exit 1
fi
echo "==> Smoke test passed"
