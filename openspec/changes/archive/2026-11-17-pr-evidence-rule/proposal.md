# Proposal

## Why

The owner wants every PR to carry screenshots or other relevant evidence. PR #129 (issue #128) first said "n/a" under "Screenshots / recordings" and had to be fixed by hand, and the rule exists only in one session's private memory. It must live in the repo so every team session follows it. Fixes #130.

## What Changes

- The Product Owner captures evidence before opening a PR and fills "Screenshots / recordings": for a visible change, light and dark themes at a narrow and a desktop width, each image viewed before attaching, committed under `docs/pr-assets/<issue-id>/` and linked by commit SHA, plus text evidence; for a non-visual change, other relevant evidence and the reason no screenshot applies; always a statement of what could not be captured.
- The PR template and `github-workflow.md` no longer allow "n/a" in that section for a user-visible change.
- `docs/AGENT_TEAM.md` and the `agent-team` spec describe the rule. PR #129 is the worked example.
- Out of scope: automating capture, a CI check, changing the Tester's role, retrofitting old PRs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-team`: adds a requirement for PR evidence.

## Impact

`.claude/skills/team-po/SKILL.md`, `.claude/rules/github-workflow.md`, `.github/pull_request_template.md`, `docs/AGENT_TEAM.md`. No code, data, infrastructure or deployment change.
