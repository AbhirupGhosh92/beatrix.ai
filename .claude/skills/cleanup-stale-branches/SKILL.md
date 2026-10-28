---
name: cleanup-stale-branches
description: Find and delete stale or merged remote branches (and local branches whose remote is gone) in this repo. Reports first, deletes only after explicit confirmation. Use when the user asks to clean up, prune or delete old, merged or stale branches.
disable-model-invocation: true
---

# Clean up stale branches

Deleting branches is destructive, so this skill always reports first and deletes only what the user confirms in this conversation.

Optional argument: a number of days, e.g. `/cleanup-stale-branches 14` (default 30). A branch with no PR and no commits for that long counts as stale.

## 1. Report (read-only)

Run the bundled script from the repo root:

```bash
.claude/skills/cleanup-stale-branches/scripts/list-stale-branches.sh --days 30
```

It prints one row per remote branch: `CLASS  BRANCH  AGE_DAYS  AHEAD  PR`.

| Class | Meaning | Action |
| --- | --- | --- |
| `PROTECTED` | default branch, `develop`, `release/*` | never delete |
| `OPEN-PR` | has an open pull request | never delete |
| `MERGED` | PR merged, or no commits beyond the default branch | safe to delete |
| `CLOSED-PR` | PR closed without merging | unmerged work: confirm each one |
| `STALE` | no PR, has unmerged commits, older than the threshold | unmerged work: confirm each one |
| `ACTIVE` | recent work with no PR yet | keep |

If the script fails because `gh` is not authenticated or `jq` is missing, say so and stop.

## 2. Show the user what would be deleted

Present the table grouped as: safe to delete (`MERGED`), needs a decision (`CLOSED-PR`, `STALE`), and kept. For each branch in the needs-a-decision group, show its unmerged commits so the user knows what would be lost:

```bash
gh api "repos/OWNER/REPO/compare/DEFAULT...BRANCH" --jq '.commits[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0])"'
```

Take OWNER/REPO from `git remote get-url origin` and DEFAULT from `gh api repos/OWNER/REPO --jq .default_branch`.

Then ask which branches to delete. Do not delete anything yet.

## 3. Delete only what was confirmed

Rules:

- Never delete `PROTECTED` or `OPEN-PR` branches, the current branch, or a branch the user did not name or approve in this conversation.
- A blanket "yes" covers the group you asked about. Unmerged-work branches (`CLOSED-PR`, `STALE`) need their own explicit yes, even if the `MERGED` group was approved.
- Never use wildcards or loops over unfiltered branch lists. Delete exact names.

Before deleting, record each branch's current SHA so it can be restored:

```bash
git ls-remote --heads origin BRANCH
```

Delete the approved branches:

```bash
git push origin --delete BRANCH [BRANCH ...]
```

If that is refused (for example the session's git proxy blocks deletes), try the API once:

```bash
gh api -X DELETE "repos/OWNER/REPO/git/refs/heads/BRANCH"
```

If that is refused too, stop retrying. Print the exact `git push origin --delete ...` commands for the user to run themselves.

## 4. Local branches

```bash
git fetch --prune origin
git branch -vv | grep ': gone\]'
```

These are local branches whose remote was deleted. Offer to remove them with `git branch -d BRANCH` (safe: refuses if unmerged). Use `git branch -D` only for a branch the user explicitly approves after you have shown its unmerged commits. Never delete the checked-out branch.

## 5. Summarize

List what was deleted with its last SHA, what was kept and why, and anything that could not be deleted. To restore a deleted branch:

```bash
git push origin SHA:refs/heads/BRANCH
```

Restored branches still have to satisfy the repo's branch naming rules (`<feature|bug|spike|hotfix>/<issue-id>-<summary>` or `release/<major.minor[.patch]>`), and the Claude branch-name hook blocks other names.
