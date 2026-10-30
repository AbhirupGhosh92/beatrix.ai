#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/log.sh"

# ==============================================================================
# Post-deploy checks against the deployed site. Read-only: only GET requests, no sign-in,
# nothing is written. Fails the run if the site is not serving correctly.
#
# Usage: smoke-test.sh <site_url>
# ==============================================================================

SITE_URL="${1:?Usage: smoke-test.sh <site_url>}"
SITE_URL="${SITE_URL%/}"
fail=0

check() { result "ok: $1"; }
bad()   { echo "::error title=Smoke test::$1" >&2; fail=1; }

# A new App Hosting rollout can take a short while to start serving.
fetch() {
  curl --silent --show-error --location --max-time 30 \
    --retry 6 --retry-delay 10 --retry-all-errors "$@"
}

step_start "Smoke test"
info "site: ${SITE_URL}"
info "read-only: GET requests only, no sign-in, nothing is written"

html_tmp="$(mktemp)"
trap 'rm -f "${html_tmp}"' EXIT

code="$(fetch --output "${html_tmp}" --write-out '%{http_code}' "${SITE_URL}/" || true)"
if [[ "${code}" == "200" ]]; then check "GET / returns 200"; else bad "GET / returned ${code:-no response}, expected 200"; fi

if grep -qi '<html' "${html_tmp}" 2>/dev/null; then check "home page is HTML"; else bad "home page did not return HTML"; fi

# The admin API must refuse requests without a sign-in token (it answers 401, never data).
code="$(fetch --output /dev/null --write-out '%{http_code}' "${SITE_URL}/api/admin/cms" || true)"
if [[ "${code}" == "401" ]]; then check "unauthenticated /api/admin/cms is refused (401)"; else bad "GET /api/admin/cms without a token returned ${code:-no response}, expected 401"; fi

if [[ "${fail}" -ne 0 ]]; then
  step_end
  fail "the deployed site is not serving correctly (see the errors above)." "open the App Hosting rollout in the Firebase console, or redeploy the previous good commit"
fi
result "all smoke checks passed"
step_end
