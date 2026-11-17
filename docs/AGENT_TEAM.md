# Agent team

How Asterion AI's autonomous agent team takes a change from idea to deploy: who does what, who talks to whom, which decisions stay with the owner, and how the team reports.
Read this before you start the team, change a role, or change a gate. OpenSpec capability `agent-team` (issue #126); rules in `.claude/rules/agent-team.md`.

- [1. What the team guarantees](#1-what-the-team-guarantees)
- [2. The team at a glance](#2-the-team-at-a-glance)
- [3. Roles](#3-roles)
- [4. End to end](#4-end-to-end)
- [5. Stages](#5-stages)
- [6. Who decides what](#6-who-decides-what)
- [7. Disagreements](#7-disagreements)
- [8. Status reports](#8-status-reports)
- [9. Failure loops](#9-failure-loops)
- [10. Git layout](#10-git-layout)
- [11. Communication](#11-communication)
- [12. What the owner does](#12-what-the-owner-does)
- [13. Starting and resuming the team](#13-starting-and-resuming-the-team)
- [14. Limits](#14-limits)
- [15. File map](#15-file-map)

## 1. What the team guarantees

| Guarantee | How |
|---|---|
| Every existing gate holds | Proposal review, PR review and merge, the prod confirmation and `prod-release` approval, manual environment steps, `allow_destructive`/`redeploy_all` all stay with the owner. No agent approves or merges a PR, pushes to `main`, approves `prod-release` or weakens a check. GitHub branch protection, CODEOWNERS, the branch-name hook and the pipeline's own guards remain the hard backstop. |
| The owner is asked only what is theirs | A fixed list of owner-only decisions (section 6); everything else the team decides. |
| Two voices, not five | Only the PO and the Architect talk to the owner. Builders, Tester and DevOps report to the lead that started them. |
| Nothing lives only in memory | Scope in `proposal.md`, decisions in `design.md`, progress in `tasks.md`, status on the issue, results on the PR. A restarted lead resumes from them. |
| Quiet by default | Reports only on stage changes; a push notification only when the owner must act. |

## 2. The team at a glance

```
                              OWNER
                             /     \
          (features, status,/       \(technical questions,
           gates, go/no-go)/         \ trade-offs)
                          v           v
     +----------------------+  messages  +------------------------+
     |  PRODUCT OWNER (PO)  |<---------->|       ARCHITECT        |
     |  lead session        |  negotiate |  lead session          |
     |  what + why          |  tie-break |  how                   |
     +----------------------+  escalate  +------------------------+
        |              |                    |          |         |
  start |        start |              start |    start |   start |
        v              v                    v          v         v
    +--------+    +--------+           +---------+ +---------+ +---------+
    | TESTER |    | DEVOPS |           |BUILDER 1| |BUILDER 2| |BUILDER n|
    |subagent|    |subagent|           |worktree | |worktree | |worktree |
    +--------+    +--------+           +---------+ +---------+ +---------+
     read-only     read-only            edits only its own file set
```

| Role | Kind | Defined in | Started by | Reports to | Talks to owner |
|---|---|---|---|---|---|
| Product Owner | lead session | `.claude/skills/team-po/SKILL.md` | the owner (`/team-po`) | owner | yes |
| Architect | lead session | `.claude/skills/team-architect/SKILL.md` | the PO (`start_session`) | PO, owner | yes |
| Builder | subagent, 1..n | `.claude/agents/builder.md` | the Architect | Architect | no |
| Tester | subagent | `.claude/agents/tester.md` | the PO | PO | no |
| DevOps | subagent | `.claude/agents/devops.md` | the PO | PO | no |

Why two lead sessions: a subagent cannot start other agents and cannot be talked to by the owner. The Architect needs both, so it is a full session like the PO.

## 3. Roles

### Product Owner

| | |
|---|---|
| Purpose | Decide what is built and why, keep the owner informed, and run the gates. |
| Owns | GitHub issue, `proposal.md`, spec scenarios (acceptance criteria), project board status, PR description, status reports. |
| Does | Intake and clarification; duplicate search; issue in the template; feature branch and worktree; `proposal.md` and spec deltas; starts the Architect; answers business questions; asks the owner at the gates; starts the Tester and triages its verdict; archives the change; updates docs; captures PR evidence (screenshots or other relevant evidence); pushes and opens the PR; binds the PR for CI and review events; starts DevOps after merge and for failures; asks the prod confirmation when the owner wants a release. |
| Inputs | The owner's request, the codebase, existing specs, the Architect's design, the Tester's verdict, DevOps reports. |
| Outputs | Issue, proposal, spec scenarios, status reports, PR. |
| Cannot | Edit `design.md`, `tasks.md` or code; start Builders; merge or approve; decide an owner-only matter. |

### Architect

| | |
|---|---|
| Purpose | Decide how it is built, split the work, and run the Builders. |
| Owns | `design.md` (decisions and rejected options), `tasks.md` (owner and file set per task group), merging Builder work into the feature branch. |
| Does | Reads the proposal, specs and code; discusses options with the PO; escalates new cost, cloud resources and security changes to the owner; writes design and tasks; starts Builders in worktrees; answers technical questions and relays business ones; reviews and merges Builder branches; fixes defects found by the Tester, CI or the pipeline. |
| Inputs | Proposal and specs, codebase, Builder reports, defects routed by the PO. |
| Outputs | `design.md`, `tasks.md`, merged code on the feature branch. |
| Cannot | Edit the proposal, specs or issue; start the Tester or DevOps; open, merge or approve the PR; decide an owner-only matter. |

### Builder

| | |
|---|---|
| Purpose | Implement one task group. |
| Owns | Its builder branch and the files in its file set. |
| Does | Switches to `<feature-branch>-b<n>` from the feature branch tip; implements; runs `npm run check` (and `npm run build` for `src/` changes); commits; reports. |
| Cannot | Edit outside its file set (it stops and asks); push; open a PR; talk to the owner or the PO. |

### Tester

| | |
|---|---|
| Purpose | An independent verdict on whether the change does what the specs say. |
| Does | `npm run check`, `npm run build`, `openspec validate`; checks every `#### Scenario:` by command, file content or a browser check (both themes, phone and desktop width when visual); a regression pass over the affected areas. |
| Outputs | PASS or FAIL per scenario with evidence, what it could not check, and a suggested owner for each failure. |
| Cannot | Edit files, fix anything, claim an automated test ran (there is no test runner). |

### DevOps

| | |
|---|---|
| Purpose | Get merged work deployed and diagnose pipeline problems. |
| Does | Diagnoses failing PR checks; follows the Deploy dev run after a merge (`dev-deploy` skill); diagnoses pipeline failures; repairs environments (`provision-environment` skill) and relays `ACTION REQUIRED` steps; runs `prod-deploy` when the PO passes on the owner's yes for an exact commit, project and version. |
| Cannot | Edit files; merge or approve; push to `main`; set `allow_destructive` or `redeploy_all` unasked; use `-auto-approve`, `-target` or `--force`; touch GitHub environments, protection rules or secrets; do a manual environment step. |

## 4. End to end

```
 OWNER        PO                 ARCHITECT            BUILDERS        TESTER        DEVOPS
   |           |                     |                    |              |             |
   |-- idea -->|                     |                    |              |             |
   |           | issue, branch,      |                    |              |             |
   |           | worktree, proposal, |                    |              |             |
   |           | spec scenarios      |                    |              |             |
   |           |-- start session --->|                    |              |             |
   |           |                     | read code          |              |             |
   |           |<--- options, pros/cons                   |              |             |
   |           |---- business answers -->                 |              |             |
   |           |                     | design.md          |              |             |
   |           |<--- design ready ---| tasks.md           |              |             |
   |<-- GATE 1: approve proposal ----|                    |              |             |
   |-- yes --->|-- go -------------->|                    |              |             |
   |           |                     |-- start (worktree)>|              |             |
   |           |                     |<-- technical q ----|              |             |
   |           |<-- business q ------|                    |              |             |
   |           |--- answer --------->|--- answer -------->|              |             |
   |           |                     |<-- report, branch -|              |             |
   |           |                     | review, merge      |              |             |
   |           |<-- ready to test ---|                    |              |             |
   |           |-- start ------------------------------------------------>|             |
   |           |<-- verdict ----------------------------------------------|             |
   |           |   FAIL: defect ---->| fix via Builder    |              |             |
   |           |   PASS:             |                    |              |             |
   |           | archive, docs, push, PR, bind PR         |              |             |
   |<-- GATE 2: review and merge PR -|                    |              |             |
   |-- merge   |                     |                    |              |             |
   |           |-- start ------------------------------------------------------------>|
   |           |<-- Deploy dev result, smoke, URL ------------------------------------|
   |<-- Live on dev                  |                    |              |             |
   |                                                                                    |
   |-- (later) "release vX.Y" -->|                                                      |
   |<-- GATE 3: prod-deploy confirmation (commit, project, version)                     |
   |-- yes --->|-- start, with the owner's words ------------------------------------>|
   |           |<-- prod result ------------------------------------------------------|
```

## 5. Stages

```
 +---------+   +----------+   +--------+   +----------+   +---------+   +--------+   +-----------+   +-------------+   +--------+
 | Defined |-->| Designed |-->| GATE 1 |-->| Building |-->| Testing |-->| GATE 2 |-->| Deploying |-->| Live on dev |-->| GATE 3 |
 +---------+   +----------+   +--------+   +----------+   +---------+   +--------+   +-----------+   +-------------+   +--------+
                                 owner          ^             |            owner           |                            owner
                                                |    FAIL     |                            | pipeline fail                (on request)
                                                +-------------+                            v
                                                                                  route fix (Architect) or
                                                                                  owner (manual step)
```

| Stage | Entered when | Moved by | Work in the stage |
|---|---|---|---|
| Defined | Issue, branch, proposal and spec scenarios exist | PO | Architect started |
| Designed | `design.md` and `tasks.md` exist and validate | Architect, confirmed by PO | Pros/cons exchange, tie-breaks recorded |
| Gate 1 | PO asks the owner to approve the proposal | PO | Owner reviews |
| Building | Owner approved | Architect | Builders implement, Architect merges |
| Testing | All tasks merged, check and build pass | PO (starts the Tester) | Verdict, fix loop |
| Gate 2 | Tester PASS, change archived, evidence attached, PR open | PO | Owner reviews and merges; CI and review comments handled |
| Deploying | Owner merged | PO (starts DevOps) | Deploy dev runs |
| Live on dev | Deploy dev succeeded, smoke test passed | PO | |
| Gate 3 | Owner asks for a release | PO, then DevOps | `prod-deploy` |

### PR evidence (Gate 2)

Before opening the PR the PO captures evidence and fills "Screenshots / recordings"; it is never "n/a" for a user-visible change (worked example: PR #129 for issue #128). Visible change: screenshots in the light and dark themes at a narrow and a desktop width (headless Chrome; its minimum width is about 500px, so 320px is reported from measured results), each opened and checked before attaching, committed under `docs/pr-assets/<issue-id>/` and linked by commit SHA, plus text evidence. Non-visual change: other relevant evidence (logs, command output, scenario results) and why no screenshot applies. The PR always states what could not be captured. The exact steps are in `.claude/skills/team-po/SKILL.md`.

## 6. Who decides what

### Tier 1: gates (always the owner; existing rules)

| Gate | Asked by |
|---|---|
| Approve the proposal before implementation | PO |
| Review and merge the PR | PO |
| Every prod release (version and yes) | PO, then DevOps runs `prod-deploy` |
| Manual environment steps (exit code 3), one at a time | PO, relaying DevOps |
| `allow_destructive`, `redeploy_all`, anything that would weaken a gate | whoever hits it; never a workaround |

### Tier 2: only the owner can decide

| Trigger | Asked by |
|---|---|
| Scope change after the proposal was approved | PO |
| Behavior no spec, code or issue establishes (never invented) | PO |
| The owner's personal profile content: copy, metrics, resume facts | PO |
| New ongoing cost or cloud resources: GCP services, IAM, secrets, a new Cloud Function | Architect (before any Builder starts) |
| Security, auth, access-control or stored-data changes beyond the proposal | Architect |
| The same failure still failing after 3 fix attempts | PO |

### Tier 3: the team decides

Library choice within the existing stack, file structure, task split, in-scope refactors, ordinary test, lint, build failures, dev pipeline failures with a clear cause, wording of issues and PRs within the templates. The owner sees these only through `design.md` and the stage reports.

## 7. Disagreements

```
  disagreement between PO and Architect
       |
       v
  each states position + evidence (code, spec, rule)
       |
       v
  whose domain? --- what / why ---------> PO decides ------+
       |                                                   |
       +--- how ------------------------> Architect decides+
       |                                                   v
       |                              decision + rejected option recorded in design.md
       |
       +--- both domains, still split after 2 rounds
                         |
                         v
           ONE message to the owner:
           context | both options | joint recommendation | what is blocked | what continues
```

## 8. Status reports

The PO reports **only on stage changes**, in its chat and as a comment on the issue. A Testing to Building loop is reported from its second occurrence. A push notification goes out only when "Needs you" is not "nothing". There is no periodic digest.

```
#126 agent-team-workflow   stage: Testing  (was: Building)
Done:      tasks 1-6 of 8 merged (builder-1, builder-2)
Now:       Tester checking 12 spec scenarios
Blocked:   nothing
Needs you: nothing
```

Escalation example (cross-domain deadlock):

```
#131 resume-sharing   needs your decision
Context:   Sharing a resume by link needs either a public route or signed URLs.
Options:   A) public /r/<id> route (PO: simplest for recruiters; Architect: changes the
              default-deny access policy)  B) time-limited signed URL (Architect: no policy
              change; PO: links expire, recruiters may hit dead links)
Recommend: B with 30-day expiry
Blocked:   Building of task group 2
Continues: task groups 1 and 3
```

## 9. Failure loops

```
 Tester FAIL --> PO triage --+--> business gap --> PO updates proposal/specs --> Architect adjusts --+
                             |                                                                     |
                             +--> defect -------> Architect --> Builder fix --> merge -------------+
                                                                                                   v
                                                                                   Tester runs again
 attempt 3 on the same failure fails --> owner (tier 2)

 PR CI red ------> PO starts DevOps (diagnose) --> code: Architect | environment/gate: owner
 Review comment -> business: PO answers | technical: Architect fixes, PO replies on the PR
 Deploy dev red -> PO starts DevOps (diagnose) --> code: Architect, new PR | ACTION REQUIRED: owner, one step at a time
```

No loop ever disables a hook, check, plan guard or protection to get green.

## 10. Git layout

```
 origin/main
   |
   +-- feature/<id>-<summary>            .claude/worktrees/<summary>  (PO + Architect share it)
          |
          +-- feature/<id>-<summary>-b1  builder-1 isolated worktree  --+
          +-- feature/<id>-<summary>-b2  builder-2 isolated worktree  --+--> git merge --no-ff by the Architect,
                                                                           worktree removed, branch deleted
```

- The PO creates the worktree with `git worktree add` (so the branch-name hook sees the name), unsets the upstream, and enters it with `EnterWorktree`. The Architect session gets the worktree path in its brief and its first action is `EnterWorktree` with that path (a new session can open in the main checkout even when the PO is in the worktree).
- Each lead commits only its own files; only the Architect commits code. On a git lock, wait and retry. No history rewriting.
- Builder worktrees are created from `origin/main` by default, so each Builder first runs `git switch -c <feature-branch>-b<n> <feature-branch>`. Builder branches are never pushed.
- Only the PO pushes, and only the feature branch.

## 11. Communication

| From | To | How |
|---|---|---|
| Owner | PO or Architect | Their chat |
| PO | Architect, and back | `SendMessage` to the other session (reply to the incoming `from`); the PO gives its session id in the Architect's brief |
| Architect | Builder | The Builder's brief; follow-ups with `SendMessage` to the Builder |
| Builder, Tester, DevOps | Their lead | Their final report |
| PO | Owner | Chat, issue comment, push notification when needed |

Tested behavior (2026-11-17, see D4 in `openspec/changes/archive/2026-11-17-agent-team-workflow/design.md`): a message to an **idle** session wakes it and it can reply; a message to a **busy** session is queued until its turn ends. So a lead that waits on the other **ends its turn** instead of waiting in a loop. Both leads must run in the **same permission mode**: a session in a different mode holds cross-session messages for its user's approval. If a reply never comes after the other lead went idle, post the message on the issue and ask the owner for a one-word nudge.

## 12. What the owner does

| When | You | Typical effort |
|---|---|---|
| Start | Open a session, type `/team-po` and describe the feature | one message |
| Clarifications | Answer tier-2 questions if any | only when asked |
| Gate 1 | Read the proposal (links in the report), approve or ask for changes | one review |
| Gate 2 | Review the PR and merge it | one review |
| Manual steps | Do the `ACTION REQUIRED` step the PO relays, say done | only on environment problems |
| Gate 3 | Ask for a release, answer the confirmation | two messages |

You can talk to the Architect directly at any time; it tells the PO about anything that changes the plan.

## 13. Starting and resuming the team

1. In the repository's main checkout, open a new session and type `/team-po`, then describe the feature (or name an issue).
2. The PO creates the issue, branch, worktree and proposal, then starts the Architect session (it appears as a linked session you can open).
3. To resume after a break, open the PO session (or a new one with `/team-po` and the issue number); it rebuilds the stage from the issue, the change folder and the PR.
4. One feature per PO/Architect pair. For a second feature at the same time, start a second `/team-po` session.

## 14. Limits

- **No test runner.** The Tester's PASS covers typecheck, lint, build, spec validation and browser checks, not automated tests. A test runner is a separate follow-up.
- **Experimental runtime pieces.** Cross-session messaging depends on the desktop app; section 11 has the fallback.
- **Cost.** Parallel Builders and two lead sessions use more tokens than one session; the Architect starts Builders only for groups worth one.
- **Agents can agree on something the owner would veto.** The owner-only list, `design.md` records and stage reports make that visible; the owner can correct either lead at any time.

## 15. File map

| File | Purpose |
|---|---|
| `docs/AGENT_TEAM.md` | This document |
| `.claude/rules/agent-team.md` | Rules every team agent follows (always loaded) |
| `.claude/skills/team-po/SKILL.md` | PO playbook (`/team-po`) |
| `.claude/skills/team-architect/SKILL.md` | Architect playbook (`/team-architect`) |
| `.claude/agents/builder.md` | Builder subagent |
| `.claude/agents/tester.md` | Tester subagent |
| `.claude/agents/devops.md` | DevOps subagent |
| `openspec/specs/agent-team/spec.md` | The capability's requirements |
