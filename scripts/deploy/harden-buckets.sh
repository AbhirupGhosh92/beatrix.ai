#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/log.sh"

# ==============================================================================
# Make sure the buckets that hold state and CMS data keep old object versions, so an
# overwritten or deleted file can be restored. Only ever turns protection ON; it never
# turns anything off, never deletes objects and never touches object contents.
#
# Usage: harden-buckets.sh <state_bucket> <cms_bucket>
#   state_bucket  Terraform state bucket (also holds plans, markers and backups)
#   cms_bucket    default Storage bucket (cms/ and cms-backups/), skipped if it does not exist
#
# Adds, only when missing:
#   - object versioning on both buckets
#   - public access prevention on the state bucket
#   - on the state bucket, retention for saved plans (7 days) and backups (90 days) by prefix,
#     only when the bucket has no lifecycle configuration at all
#   - on the CMS bucket, a rule that deletes noncurrent versions after 90 days, only when the
#     bucket has no lifecycle configuration at all (so an existing configuration is never replaced)
#
# Each bucket's settings are read once as JSON. If that read fails the script stops: a failed
# read is never treated as "nothing configured".
# ==============================================================================

STATE_BUCKET="${1:?Usage: harden-buckets.sh <state_bucket> <cms_bucket>}"
CMS_BUCKET="${2:?Usage: harden-buckets.sh <state_bucket> <cms_bucket>}"

# Predicates over the JSON description of a bucket (read from stdin). They accept either key
# spelling gcloud and the API use, and treat an absent field as "not set".
json_versioning_on()  { jq -e '(.versioning_enabled // .versioning.enabled // false) == true' >/dev/null; }
json_pap_enforced()   { jq -e '((.public_access_prevention // .iamConfiguration.publicAccessPrevention // "") | ascii_downcase) == "enforced"' >/dev/null; }
json_has_lifecycle()  { jq -e '[.. | objects | select(has("rule")) | .rule | length] | any(. > 0)' >/dev/null; }

describe() { gcloud storage buckets describe "gs://$1" --format=json; }

apply_lifecycle() { # $1 bucket, $2 json file
  gcloud storage buckets update "gs://$1" --lifecycle-file="$2"
}

step_start "Protect buckets (versioning, retention)"
info "state bucket: gs://${STATE_BUCKET}"
info "CMS bucket:   gs://${CMS_BUCKET}"
info "This step only turns protection ON. It never changes or deletes objects."

if ! state_json="$(describe "${STATE_BUCKET}" 2>/dev/null)"; then
  fail "State bucket gs://${STATE_BUCKET} cannot be read." "run ./scripts/recreate-environment.sh <env> first"
fi

if json_versioning_on <<<"${state_json}"; then
  decision "state bucket versioning" "already on, nothing to do"
else
  decision "state bucket versioning" "off, enabling"
  gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning
fi

if ! json_pap_enforced <<<"${state_json}"; then
  decision "state bucket public access prevention" "not enforced, enforcing"
  gcloud storage buckets update "gs://${STATE_BUCKET}" --public-access-prevention
fi

# Saved plans are only needed until the run that made them finishes; backups are kept 90 days.
# Matches by prefix, so Terraform state objects are never expired.
if ! json_has_lifecycle <<<"${state_json}"; then
  decision "state bucket retention" "no lifecycle configured, adding deploy/plans/ 7 days and backups/ 90 days"
  tmp="$(mktemp)"
  cat > "${tmp}" <<'JSON'
{"rule": [
  {"action": {"type": "Delete"}, "condition": {"age": 7, "matchesPrefix": ["deploy/plans/"]}},
  {"action": {"type": "Delete"}, "condition": {"age": 90, "matchesPrefix": ["backups/"]}}
]}
JSON
  apply_lifecycle "${STATE_BUCKET}" "${tmp}"
  rm -f "${tmp}"
fi

# The CMS bucket is created by Firebase ("Get started"), so it may not exist yet. Only a clean
# "not found" counts as absent; any other error stops the run.
err="$(mktemp)"
if cms_json="$(describe "${CMS_BUCKET}" 2>"${err}")"; then
  if json_versioning_on <<<"${cms_json}"; then
    decision "CMS bucket versioning" "already on, nothing to do"
  else
    decision "CMS bucket versioning" "off, enabling"
    gcloud storage buckets update "gs://${CMS_BUCKET}" --versioning
  fi
  if ! json_has_lifecycle <<<"${cms_json}"; then
    decision "CMS bucket retention" "no lifecycle configured, adding noncurrent versions deleted after 90 days"
    tmp="$(mktemp)"
    cat > "${tmp}" <<'JSON'
{"rule": [{"action": {"type": "Delete"}, "condition": {"daysSinceNoncurrentTime": 90}}]}
JSON
    apply_lifecycle "${CMS_BUCKET}" "${tmp}"
    rm -f "${tmp}"
  fi
elif grep -qiE '404|not found|does not exist' "${err}"; then
  decision "CMS bucket" "not created yet (Firebase Storage Get started), skipped"
else
  cat "${err}" >&2
  rm -f "${err}"
  fail "Cannot read gs://${CMS_BUCKET}." "check the deployer service account's Storage permissions"
fi
rm -f "${err}"
result "bucket protection is in place"
step_end
