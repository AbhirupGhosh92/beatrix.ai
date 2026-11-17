# Tasks

## 1. Spike: peer session messaging

- [x] 1.1 Start two local sessions, leave one idle, send it a message from the other with `SendMessage`, and record in `design.md` (D4) whether it woke and answered; if not, write the fallback as the chosen path. Verify: D4 states the observed result.

## 2. Shared rules

- [x] 2.1 Write `.claude/rules/agent-team.md`: the owner gates, the three escalation tiers, the domain tie-break, artifact ownership, spawning rights and the standing authorization for routine GitHub writes (and what it excludes), each traceable to a requirement in `specs/agent-team/spec.md`. Verify: every requirement of the spec is covered or explicitly delegated to a playbook; the file stays under ~80 lines.

## 3. Subagent definitions

- [x] 3.1 Write `.claude/agents/builder.md` (tools per design D3, works only on its assigned file set, stops and asks when it needs another file, never pushes to `main` or opens a PR, reports to the Architect). Verify: the file parses (frontmatter `name`, `description`, `tools`) and the agent appears in the available agent types of a new session.
- [x] 3.2 Write `.claude/agents/tester.md` (no edit or write tools; verdict per spec scenario with evidence; runs `npm run check`, `npm run build`, `openspec validate --all` and browser checks; states what it could not check). Verify: as in 3.1, and its `tools` list contains no edit or write tool.
- [x] 3.3 Write `.claude/agents/devops.md` (no edit or write tools; follows PR checks and the dev pipeline via `dev-deploy`; runs `prod-deploy` only after the owner's explicit yes; relays exit-code-3 steps; never sets `allow_destructive` or `redeploy_all` unasked). Verify: as in 3.1, and its instructions defer to the `prod-deploy` and `dev-deploy` skills rather than restating their steps.

## 4. Lead playbooks

- [x] 4.1 Write `.claude/skills/team-po/SKILL.md`: intake, issue and branch creation, `proposal.md` and spec scenarios, starting the Architect session (D6), proposal gate, starting the Tester and DevOps, failure triage, archive and PR, PR binding (D8), stage reports in the agreed format, escalation messages. Verify: the skill is listed in a new session and each spec requirement owned by the PO is addressed.
- [x] 4.2 Write `.claude/skills/team-architect/SKILL.md`: reading the code, the pros/cons exchange with the PO, `design.md` and `tasks.md` with an owner and file set per task, starting Builders in worktrees, answering Builder questions, merging Builder branches (D5), recording tie-breaks. Verify: as in 4.1 for the Architect's requirements.

## 5. Workflow document

- [x] 5.1 Write `docs/AGENT_TEAM.md`: overview, role cards (responsibilities, inputs, outputs, talks to, can and cannot), the topology diagram, the end-to-end sequence diagram, the stage diagram with owners, the escalation tiers table, the tie-break flow, the report format with an example, the git topology, failure loops (test fail, CI fail, pipeline fail), what the owner does at each gate, how to start the team, and known limits. Diagrams in plain ASCII. Verify: every requirement in `specs/agent-team/spec.md` is described, and the document matches the rule file and playbooks.

## 6. Integration check

- [x] 6.1 In a fresh session, confirm the three subagents and two skills load, and walk one small, low-risk feature (or a dry run on a throwaway issue) through Defined to the PR gate; record the outcome in the PR. If not done, list it as a follow-up in the PR. Verify: the PR's Verification section states which happened.
  - Result (2026-11-17): a headless session started in the feature worktree listed `builder`, `tester` and `devops` with their tool lists, `team-architect` in its skills, and `.claude/rules/agent-team.md` loaded; `team-po` is user-invocable only (`/team-po`) by design. The end-to-end run on a real feature was not done in this change; it is listed as a follow-up in the PR.
- [x] 6.2 Run `openspec validate --all`, `npm run check` and `npm run build`. Verify: all pass.

## 7. Docs to update

- [x] 7.1 Update `CLAUDE.md` (pointer to `docs/AGENT_TEAM.md`, the rule file, the skills and the agents) and let the pre-push hook regenerate the README Project structure section for the new `.claude/agents/` and skills; `docs/DEPLOYMENT.md` needs no change because the pipeline is unchanged (confirm). Verify: `node scripts/update-readme.mjs` leaves no diff after commit.

## Workflow follow-up

- Run `/opsx:archive` before the PR is marked ready, and commit the archived result.
- Open the PR in the standard template, linking #126.
- Follow-up issue: add a test runner so the Tester can run automated tests.
