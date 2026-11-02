#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# The last stage of a prod run: cut the release for the commit that was just deployed.
# Creates the branch release/<version> at that commit, the tag v<version> and the GitHub release
# (marked Latest, notes from RELEASE_NOTES.md at that commit). Running it again for the same commit
# and version updates the release and creates nothing twice. A branch or tag that already points at
# another commit stops it before anything is changed.
#
# Usage: cut-release.sh <commit-sha> <version>
# Needs: GH_TOKEN with contents: write, GITHUB_REPOSITORY (owner/name), RELEASE_NOTES.md checked out
# at the commit. GH overrides the gh command (used by the tests).
# ==============================================================================

source "$(dirname "${BASH_SOURCE[0]}")/log.sh"

SHA="${1:?usage: cut-release.sh <commit-sha> <version>}"
VERSION="${2:?usage: cut-release.sh <commit-sha> <version>}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is not set}"
GH="${GH:-gh}"
BRANCH="release/${VERSION}"
TAG="v${VERSION}"

step_start "Cut release ${TAG}"
[[ "${VERSION}" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] || fail "version '${VERSION}' is not X.Y or X.Y.Z" "check the version input"
[[ -s RELEASE_NOTES.md ]] || fail "RELEASE_NOTES.md is missing or empty" "it must exist at the deployed commit"
info "repository: ${REPO}; commit: ${SHA:0:7}; branch: ${BRANCH}; tag: ${TAG}"

# The commit a ref points at ("" if it does not exist). 404 means the ref is not there.
ref_commit() {
  local json
  if ! json="$("${GH}" api "repos/${REPO}/git/ref/$1" 2>/dev/null)"; then
    echo ""
    return 0
  fi
  local type object
  type="$(jq -r '.object.type' <<<"${json}")"
  object="$(jq -r '.object.sha' <<<"${json}")"
  if [[ "${type}" == "tag" ]]; then
    "${GH}" api "repos/${REPO}/git/tags/${object}" --jq '.object.sha'
  else
    echo "${object}"
  fi
}

branch_at="$(ref_commit "heads/${BRANCH}")"
tag_at="$(ref_commit "tags/${TAG}")"
for pair in "${BRANCH}:${branch_at}" "${TAG}:${tag_at}"; do
  name="${pair%%:*}"; at="${pair#*:}"
  if [[ -n "${at}" && "${at}" != "${SHA}" ]]; then
    fail "${name} already points at ${at:0:7}, not at ${SHA:0:7}" "nothing was changed; use a new version"
  fi
done

if [[ -z "${branch_at}" ]]; then
  "${GH}" api "repos/${REPO}/git/refs" -f "ref=refs/heads/${BRANCH}" -f "sha=${SHA}" >/dev/null
  decision "branch" "created ${BRANCH} at ${SHA:0:7}"
else
  decision "branch" "${BRANCH} already at ${SHA:0:7}, left as it is"
fi

if "${GH}" release view "${TAG}" >/dev/null 2>&1; then
  "${GH}" release edit "${TAG}" --title "${TAG}" --notes-file RELEASE_NOTES.md --latest
  action="updated"
else
  # gh creates the tag at the commit when it does not exist yet.
  "${GH}" release create "${TAG}" --target "${SHA}" --title "${TAG}" --notes-file RELEASE_NOTES.md --latest
  action="created"
fi
decision "release" "${TAG} ${action} (marked Latest)"
result "release ${TAG} ${action}; branch ${BRANCH} at ${SHA:0:7}"
step_end
