#!/usr/bin/env bash
# ==============================================================================
# Shared log format for the deployment scripts and workflow steps. Source it:
#
#   source "$(dirname "${BASH_SOURCE[0]}")/log.sh"
#
#   step_start "Snapshot the CMS files"     opens a log group and says what the step is about to do
#   info "bucket: gs://x"                   an input or a fact the step relies on
#   decision "skip" "nothing changed"       what the step decided and WHY
#   result "snapshot written to gs://..."   what actually happened
#   fail "bucket missing" "run ./scripts/recreate-environment.sh dev"
#                                           names the step, the problem and the next action; exits 1
#   step_end                                closes the log group
#
# Everything goes to stderr, so a script that prints a value on stdout (components.sh) stays
# usable in $(...). In GitHub Actions the groups fold in the log; locally they are plain lines.
# ==============================================================================

LOG_STEP="${LOG_STEP:-}"

_in_actions() { [[ "${GITHUB_ACTIONS:-}" == "true" ]]; }

step_start() {
  LOG_STEP="$1"
  if _in_actions; then echo "::group::${LOG_STEP}" >&2; fi
  echo "[step]     ${LOG_STEP}" >&2
}

info()     { echo "[info]     $*" >&2; }
decision() { echo "[decision] $1: $2" >&2; }
result()   { echo "[result]   $*" >&2; }

step_end() {
  if _in_actions; then echo "::endgroup::" >&2; fi
  LOG_STEP=""
}

fail() {
  local step="${LOG_STEP:-unknown step}"
  if _in_actions; then
    echo "::endgroup::" >&2
    echo "::error title=${step}::$1${2:+ Next: $2}" >&2
  else
    echo "[failed]   ${step}: $1" >&2
    if [[ -n "${2:-}" ]]; then echo "[next]     $2" >&2; fi
  fi
  exit 1
}
