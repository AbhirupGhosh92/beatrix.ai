#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Change detection for the four deployable components. A component is deployed only when
# the hash of its sources differs from the hash recorded after its last successful deploy,
# so a release that does not touch it leaves it exactly as it is.
#
#   components.sh hash <component>
#       Print the sha256 of the component's tracked sources (no cloud access needed).
#   components.sh changed <component> <state_bucket>
#       Print "true" when the hash differs from the recorded marker (or there is none).
#       Logs the hashes and the decision with its reason to stderr.
#   components.sh status <component> <state_bucket>
#       Print "changed<TAB>current hash<TAB>recorded hash<TAB>reason" on one line.
#   components.sh record <component> <state_bucket> <git_sha> <run_id>
#       Record the current hash after the component was deployed successfully.
#
# Components: functions | rules | apphosting | python
# Markers live at gs://<state_bucket>/deploy/markers/<component>.json (the per-environment
# Terraform state bucket, versioned, private).
# Run from the repository root.
# ==============================================================================

source "$(dirname "${BASH_SOURCE[0]}")/log.sh"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

usage() { sed -n '4,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 2; }

# sha256 over the content and path of every tracked file under the given paths.
hash_paths() {
  git ls-files -z -- "$@" | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1
}

# sha256 of one section of firebase.json (so unrelated sections do not trigger a deploy).
hash_firebase_section() {
  jq -cS --arg k "$1" '.[$k] // null' firebase.json | sha256sum | cut -d' ' -f1
}

component_hash() {
  case "$1" in
    functions)
      { hash_paths functions; hash_firebase_section functions; } | sha256sum | cut -d' ' -f1 ;;
    rules)
      { hash_paths firestore.rules storage.rules; hash_firebase_section firestore; hash_firebase_section storage; } \
        | sha256sum | cut -d' ' -f1 ;;
    apphosting)
      { hash_paths src public package.json pnpm-lock.yaml pnpm-workspace.yaml next.config.ts postcss.config.mjs tsconfig.json apphosting.yaml; \
        hash_firebase_section apphosting; } | sha256sum | cut -d' ' -f1 ;;
    python)
      hash_paths ai_backend ;;
    *) echo "Unknown component '$1' (functions | rules | apphosting | python)" >&2; exit 2 ;;
  esac
}

marker_uri() { echo "gs://$2/deploy/markers/$1.json"; }

recorded_hash() {
  local uri
  uri="$(marker_uri "$1" "$2")"
  if gcloud storage cat "${uri}" 2>/dev/null | jq -er '.hash' 2>/dev/null; then
    return 0
  fi
  echo "none"
}

component_status() {
  local current previous
  current="$(component_hash "$1")"
  previous="$(recorded_hash "$1" "$2")"
  if [[ "${current}" == "${previous}" ]]; then
    printf 'false\t%s\t%s\t%s\n' "${current}" "${previous}" "sources are identical to the last deployed version"
  elif [[ "${previous}" == "none" ]]; then
    printf 'true\t%s\t%s\t%s\n' "${current}" "${previous}" "no deployment recorded yet"
  else
    printf 'true\t%s\t%s\t%s\n' "${current}" "${previous}" "sources differ from the last deployed version"
  fi
}

cmd="${1:-}"
case "${cmd}" in
  hash)
    [[ $# -eq 2 ]] || usage
    component_hash "$2"
    ;;
  status)
    # One tab-separated line: changed<TAB>current<TAB>previous<TAB>reason (for the run summary).
    [[ $# -eq 3 ]] || usage
    component_status "$2" "$3"
    ;;
  changed)
    [[ $# -eq 3 ]] || usage
    IFS=$'\t' read -r changed current previous reason <<<"$(component_status "$2" "$3")"
    info "$2: source hash ${current:0:12}, last deployed hash ${previous:0:12}"
    if [[ "${changed}" == "true" ]]; then decision "$2" "changed: ${reason}"; else decision "$2" "unchanged, will not be touched"; fi
    echo "${changed}"
    ;;
  record)
    [[ $# -eq 5 ]] || usage
    current="$(component_hash "$2")"
    jq -n --arg hash "${current}" --arg sha "$4" --arg run "$5" --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{hash: $hash, git_sha: $sha, run_id: $run, deployed_at: $at}' \
      | gcloud storage cp - "$(marker_uri "$2" "$3")" --content-type=application/json >/dev/null
    result "recorded ${2} hash ${current:0:12} for commit ${4:0:7}"
    ;;
  *)
    usage
    ;;
esac
