#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# The admin and developer emails of an environment are personal, so they do not have to be committed:
# the committed terraform/environments/<env>.tfvars may hold placeholders, and the real values come
# from two GitHub environment variables. This script turns them into `terraform plan` arguments for
# stage 1, one argument per line (read them with `mapfile -t`), so a real value always wins over the
# tfvars file:
#
#   TF_ADMIN_EMAILS         -> -var allowed_admin_emails=<list>   e.g. ["a@example.com"]
#   TF_DEVELOPER_MEMBERS    -> -var developer_members=<list>      e.g. ["user:a@example.com"]
#
# Both are passed in the environment as ADMIN_EMAILS and DEVELOPER_MEMBERS (the workflow maps them
# from the GitHub variables). A value must be a single-line list of plain quoted strings: anything
# else, including a Terraform interpolation, stops the run before the plan. An unset or empty value
# prints nothing and the tfvars file is used. Values are never printed, only how many entries.
# Usage: scripts/deploy/email-vars.sh
# ==============================================================================

source "$(dirname "${BASH_SOURCE[0]}")/log.sh"

LIST='^\[[[:space:]]*("[^"\\$%{}]+"([[:space:]]*,[[:space:]]*"[^"\\$%{}]+")*)?[[:space:]]*\]$'

emit() {
  local variable="$1" value="${2:-}" label="$3"
  if [[ -z "${value//[[:space:]]/}" ]]; then
    decision "${label}" "not set as a GitHub variable, the committed tfvars value is used"
    return 0
  fi
  if [[ "${value}" == *$'\n'* || ! "${value}" =~ ${LIST} ]]; then
    fail "the GitHub variable for ${label} is not a single-line list of plain quoted strings" "set it like [\"you@example.com\"] (no interpolation, no line breaks)"
  fi
  local count
  count="$(awk -F'"' '{print NF - 1}' <<<"${value}")"
  decision "${label}" "taken from the GitHub variable ($((count / 2)) entries), overriding the tfvars file"
  printf '%s\n%s\n' "-var" "${variable}=${value}"
}

emit allowed_admin_emails "${ADMIN_EMAILS:-}" "admin emails"
emit developer_members "${DEVELOPER_MEMBERS:-}" "developer members"
