# Proposal

Fixes #126

## Why

Every change today is driven step by step by the owner through a single Claude session: issue, branch, OpenSpec proposal, implementation, checks, PR and deploy, with the owner relaying between concerns by hand. The owner wants a team of agents that works like an IT team (defines, designs, builds, tests and deploys on its own, coordinates internally and reports progress) while keeping every existing gate, so the owner is involved only in decisions that are theirs to make.

## What Changes

- Add an **agent team** made of two lead sessions and three subagent roles:
  - **Product Owner** (lead session, control plane): owns the GitHub issue, `proposal.md`, spec scenarios, project board status, PR description and status reports; spawns the Tester and DevOps subagents.
  - **Architect** (lead session, technical plane): owns `design.md`, `tasks.md` (an owner and a file set per task) and merging Builder work into the feature branch; spawns Builder subagents.
  - **Builder** (subagent, one or more, in parallel when file sets are disjoint): implements assigned tasks in its own worktree and reports to the Architect.
  - **Tester** (subagent): verifies the change (typecheck, lint, build, `openspec validate`, a browser check of each spec scenario) and reports pass or fail with evidence to the PO.
  - **DevOps** (subagent): watches PR checks and the dev pipeline after merge, and runs `prod-deploy` only after the owner's explicit yes.
- The two leads message each other directly; the owner can talk to either. Each lead edits only the artifacts it owns.
- A **three-tier escalation policy**: gates the rules already reserve for the owner; decisions only the owner can make (scope change, unestablished behavior, personal content, new cost or cloud resources, security and stored-data changes, a failure persisting after 3 fix attempts); everything else stays in the team.
- A **tie-break rule**: the domain owner decides (PO: what and why; Architect: how), the decision and rejected option are recorded in `design.md`, and only a cross-domain deadlock after 2 rounds goes to the owner as one structured message.
- **Status reporting on stage changes only**, to the PO chat and as a comment on the issue, with a push notification only when the owner is needed. No periodic digest.
- A standing authorization, written in a rule file, for the team's routine GitHub writes (issues, branches, issue comments, PRs), so these do not prompt the owner each time.
- A workflow document `docs/AGENT_TEAM.md` with roles, responsibilities, diagrams, escalation, stage model and report format.

## Capabilities

### New Capabilities
- `agent-team`: the roles, ownership boundaries, spawning rules, gates, escalation and reporting that the repository's autonomous agent team follows when taking a change from idea to deploy.

### Modified Capabilities
None. The deploy skills (`deployment-pipeline`, "Deploy skills") are reused unchanged; the team calls them under the same conditions.

## Impact

- New files: `docs/AGENT_TEAM.md`, `.claude/agents/builder.md`, `.claude/agents/tester.md`, `.claude/agents/devops.md`, lead instructions for the PO and the Architect, `.claude/rules/agent-team.md`.
- Updated: `CLAUDE.md` (pointer), README if its project structure section lists `.claude/`.
- No application code, Cloud Functions, Terraform, pipeline or data changes.

## Out of scope

- Removing or relaxing any gate: proposal review, branch protection, CODEOWNERS review, the prod confirmation and `prod-release` approval, manual environment steps, `allow_destructive` and `redeploy_all`.
- The experimental agent teams runtime (role files are written so a later switch is cheap).
- Adding a test runner (a separate follow-up).
- Running several features at once with one PO/Architect pair.
