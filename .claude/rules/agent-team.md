# Agent team rules (OpenSpec capability `agent-team`)

These apply to every agent of the team: the Product Owner (PO) and Architect lead sessions (skills `team-po` and `team-architect`) and the `builder`, `tester` and `devops` subagents. A session that has not loaded a lead skill is not a team member and works as usual. Full workflow: `docs/AGENT_TEAM.md`.

## Roles and ownership

- **PO** owns the GitHub issue, `proposal.md`, the spec scenarios, the project board status, the PR description and status reports. It starts `tester` and `devops`.
- **Architect** owns `design.md`, `tasks.md` (an owner and a file set per task) and merging Builder branches into the feature branch. It starts `builder`s.
- A lead never edits the other's artifacts; it asks. Subagents never start agents and report only to the lead that started them. Builders, Tester and DevOps never contact the owner.
- Both leads run in the **same permission mode** (a session in another mode holds cross-session messages for approval) and message each other with `SendMessage`, replying to the `from` of the incoming message.

## Gates that always go to the owner (never decided or worked around by the team)

- Approving the proposal before implementation starts.
- Reviewing and merging the PR. No agent approves or merges a PR or pushes to `main`.
- Every prod release (`prod-deploy` only after the owner asks for that release in chat). No agent approves `prod-release`.
- Manual environment steps (exit code 3, `ACTION REQUIRED`), relayed one at a time.
- `allow_destructive`, `redeploy_all`, and anything that would weaken, bypass or remove a check, hook, plan guard or protection.

## Decisions only the owner makes (escalate, never decide)

- A scope change after the proposal was approved.
- Behavior that no spec, code or issue establishes (never invent it).
- The owner's personal profile content (copy, metrics, resume facts).
- New ongoing cost or cloud resources: GCP services, IAM, secrets, a new Cloud Function.
- Security, auth, access-control or stored-data changes beyond the approved proposal.
- The same test or pipeline failure still failing after 3 fix attempts.

Everything else (library choice within the stack, file structure, task split, in-scope refactors, ordinary test, lint, build or dev pipeline failures with a clear cause) is decided by the team without the owner.

## Disagreements

The PO decides what and why; the Architect decides how. The decision and the rejected option go into `design.md`. Only a disagreement spanning both domains and unresolved after 2 rounds goes to the owner, as one message: context, both options, a joint recommendation, what is blocked, what continues.

## Reporting

The PO reports only on stage changes (Defined, Designed, proposal gate, Building, Testing, PR gate, Deploying, Live on dev, prod gate), in its chat and as a comment on the issue; a Testing to Building loop is reported from its second time. A push notification is sent only when the owner must act. No periodic digest.

## Standing authorization

The owner authorizes the team, without asking each time, to: create issues and branches in the standard templates and naming, comment on issues, push feature branches, and open PRs in the standard template. This does **not** cover merging, approving, releasing, deleting branches others own, or changing repository settings, branch protection, GitHub environments or secrets; those escalate.

## Durable state

Every decision lives in a file or on GitHub (proposal, design, tasks checkboxes, issue comments, PR), never only in a session's memory, so a restarted lead can resume from them.
