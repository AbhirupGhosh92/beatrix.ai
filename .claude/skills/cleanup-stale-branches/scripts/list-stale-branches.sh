#!/usr/bin/env bash
# Read-only report of remote branches and whether they are safe to delete.
#
# Usage: list-stale-branches.sh [--days N] [--repo owner/repo]
#   --days N   a branch with no PR and no commits for N days is "stale" (default 30)
#   --repo     defaults to the owner/repo of the "origin" remote
#
# Needs: gh (authenticated), jq. Uses only REST endpoints, never deletes anything.
#
# Output: tab-separated rows
#   CLASS  BRANCH  AGE_DAYS  AHEAD  PR
# where CLASS is one of
#   PROTECTED     default branch, develop, release/*  -> never delete
#   OPEN-PR       has an open pull request            -> keep
#   MERGED        PR merged, or no commits beyond the default branch -> safe to delete
#   CLOSED-PR     PR closed without merging           -> review: unmerged work
#   STALE         no PR, ahead of default, older than --days -> review: unmerged work
#   ACTIVE        recent work, no PR yet              -> keep
set -euo pipefail

days=30
repo=""
while [ $# -gt 0 ]; do
  case "$1" in
    --days) days="$2"; shift 2 ;;
    --repo) repo="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

command -v gh >/dev/null || { echo "gh is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

if [ -z "$repo" ]; then
  url=$(git remote get-url origin)
  repo=$(printf '%s' "$url" | sed -E 's#^(git@[^:]+:|https?://[^/]+/)##; s#\.git$##')
fi
owner=${repo%%/*}

default=$(gh api "repos/$repo" --jq .default_branch)

printf 'CLASS\tBRANCH\tAGE_DAYS\tAHEAD\tPR\n'

gh api "repos/$repo/branches?per_page=100" --paginate --jq '.[] | "\(.name)\t\(.commit.sha)"' |
while IFS=$'\t' read -r name sha; do
  case "$name" in
    "$default"|develop|release/*)
      printf 'PROTECTED\t%s\t-\t-\t-\n' "$name"
      continue ;;
  esac

  age=$(gh api "repos/$repo/commits/$sha" --jq '((now - (.commit.committer.date | fromdateiso8601)) / 86400 | floor)')
  ahead=$(gh api "repos/$repo/compare/$default...$name" --jq .ahead_by 2>/dev/null || echo "?")
  pr=$(gh api "repos/$repo/pulls?state=all&head=$owner:$name&per_page=1" \
        --jq '.[0] | if . == null then "none" else "#\(.number) \(if .merged_at then "merged" else .state end)" end')

  case "$pr" in
    *" open")   class=OPEN-PR ;;
    *" merged") class=MERGED ;;
    *" closed") class=CLOSED-PR ;;
    *)
      if [ "$ahead" = "0" ]; then class=MERGED
      elif [ "$age" -ge "$days" ]; then class=STALE
      else class=ACTIVE
      fi ;;
  esac
  printf '%s\t%s\t%s\t%s\t%s\n' "$class" "$name" "$age" "$ahead" "$pr"
done
