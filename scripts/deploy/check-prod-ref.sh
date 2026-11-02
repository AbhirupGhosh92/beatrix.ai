#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Prod preflight, run by the Verify job before any plan: is this commit allowed to go to prod as
# this version? Checks, in order:
#   1. the version is X.Y or X.Y.Z
#   2. the commit is reachable from main (an unreleased branch can never reach prod)
#   3. RELEASE_NOTES.md exists and is non-empty at that commit
#   4. the branch release/<version> and the tag v<version> do not already exist at ANOTHER commit
#      (the same commit is fine: re-running a prod deploy updates its release)
#
# Usage: check-prod-ref.sh <commit-sha> <version> [remote]     (remote defaults to origin)
# Run inside a clone with the full history (actions/checkout fetch-depth: 0): it reads the fetched
# remote-tracking branches and tags, and needs no network or credentials.
# ==============================================================================

source "$(dirname "${BASH_SOURCE[0]}")/log.sh"

SHA="${1:?usage: check-prod-ref.sh <commit-sha> <version> [remote]}"
VERSION="${2:-}"
REMOTE="${3:-origin}"

step_start "Check the prod ref and version"
info "commit: ${SHA}; version: ${VERSION:-<none>}; remote: ${REMOTE}"

if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
  fail "version '${VERSION}' is not X.Y or X.Y.Z" "start the prod pipeline with a version such as 1.3 or 1.3.0"
fi
decision "version" "'${VERSION}' is valid"

if ! git rev-parse --verify --quiet "${SHA}^{commit}" >/dev/null; then
  fail "commit ${SHA} is not in this clone" "fetch the full history (actions/checkout fetch-depth: 0)"
fi
if ! git merge-base --is-ancestor "${SHA}" "refs/remotes/${REMOTE}/main"; then
  fail "commit ${SHA:0:7} is not reachable from main" "prod deploys only commits that are on main; merge the change first, or pick a commit on main"
fi
decision "commit" "${SHA:0:7} is on main"

if ! git show "${SHA}:RELEASE_NOTES.md" 2>/dev/null | grep -q '[^[:space:]]'; then
  fail "RELEASE_NOTES.md is missing or empty at ${SHA:0:7}" "write the release notes on main, then run again"
fi
decision "release notes" "RELEASE_NOTES.md is present"

# The commit a ref points at in this clone ("" when it does not exist). It reads the refs that
# `actions/checkout` with fetch-depth 0 fetched, so it needs no credentials and cannot silently pass
# on a repository it could not reach. Annotated tags are peeled to their commit.
local_commit() {
  git rev-parse --verify --quiet "$1^{commit}" 2>/dev/null || true
}

for ref in "refs/remotes/${REMOTE}/release/${VERSION}" "refs/tags/v${VERSION}"; do
  found="$(local_commit "${ref}")"
  if [[ -n "${found}" && "${found}" != "${SHA}" ]]; then
    name="release/${VERSION}"; [[ "${ref}" == refs/tags/* ]] && name="v${VERSION}"
    fail "${name} already exists at ${found:0:7}, not at ${SHA:0:7}" "choose a new version, or deploy the commit that release already points at"
  fi
  if [[ -n "${found}" ]]; then
    decision "${ref##*/}" "exists at the same commit; this run updates the release"
  else
    decision "${ref##*/}" "does not exist yet; the run cuts it after success"
  fi
done

result "prod preflight passed"
step_end
