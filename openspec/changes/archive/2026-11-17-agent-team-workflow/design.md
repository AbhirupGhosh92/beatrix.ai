# Design

## Context

See proposal.md for motivation and specs/agent-team/spec.md for the required behavior.

Current state: `.claude/` holds rules (always loaded, some path-scoped), skills (`dev-deploy`, `prod-deploy`, `provision-environment`, `cleanup-stale-branches`, the OpenSpec skills) and the `check-branch-name.py` PreToolUse hook. There is no `.claude/agents/` directory. `main` is protected with the owner as CODEOWNERS reviewer; prod needs the owner's yes plus a `prod-release` approval. There is no test runner, so verification is typecheck, lint, build, `openspec validate` and browser checks through the preview tools.

Runtime constraints that shape the design:
- A subagent cannot start another subagent, so any role that starts agents must be a full session.
- Subagents return one report to their caller and cannot message each other.
- In the desktop app, local sessions can message each other, and the app wakes a session for PR and CI events on a PR it watches.

## Goals / Non-Goals

**Goals:**
- Role files that work in the chosen runtime today and need little change if the team later moves to the agent teams runtime.
- All coordination state lives in durable places (issue, OpenSpec change folder, branch, PR), never only in a session's memory.

**Non-Goals:**
- Enforcing role boundaries with new hooks. Boundaries are enforced by each role's tool list and instructions; existing hooks and GitHub protections stay the hard backstop.
- Several concurrent features per lead pair.

## Decisions

### D1. Two lead sessions plus subagents
PO and Architect are full sessions; Builder, Tester and DevOps are subagents.
- *Alternative: one PO session with every other role as a subagent.* Rejected: the Architect could not start Builders, and the owner could not talk to the Architect.
- *Alternative: the experimental agent teams runtime.* Rejected for now: experimental and costlier; the owner chose this model. Role files stay runtime-neutral so a switch is cheap.

### D2. Lead playbooks as skills, shared gates as one rule file
- `.claude/skills/team-po/SKILL.md` and `.claude/skills/team-architect/SKILL.md` hold each lead's playbook; a session becomes a lead by loading its skill (the owner types `/team-po`, or the PO starts the Architect session with `/team-architect` in its brief).
- `.claude/rules/agent-team.md` holds only what every agent must know: the gates, the escalation tiers, the tie-break, artifact ownership and the standing GitHub authorization. It is short because rules load into every session.
- *Alternative: everything in rule files.* Rejected: every ordinary session would load both playbooks and might act as a lead.

### D3. Subagent definitions with narrowed tools
| Role | File | Tools | Isolation |
|---|---|---|---|
| Builder | `.claude/agents/builder.md` | read, search, edit, write, Bash | `worktree` (set by the Architect when it starts one) |
| Tester | `.claude/agents/tester.md` | read, search, Bash, browser preview tools; no edit or write | none (reads the feature branch) |
| DevOps | `.claude/agents/devops.md` | read, search, Bash (`gh`, `git`, scripts), deploy skills; no edit or write | none |

The Tester and DevOps cannot edit code, so a failure is always reported and fixed through the Architect. Models default to the parent's; tuning per role is an open question that changes no spec.

### D4. Communication: direct messages, durable record
- Leads talk with `SendMessage` to each other's local session id; subagents report only to the lead that started them.
- Every decision is written where it belongs: scope in `proposal.md`, technical decisions and tie-breaks in `design.md`, progress in `tasks.md` checkboxes, stage updates as issue comments. A restarted session rebuilds its state from these.
- **Spike result (task 1, 2026-11-17):** a throwaway local session was left idle and sent `PING` with `SendMessage` from another local session. Delivery reported "its turn has started on it": the idle session woke, read the message and replied `PONG` with `SendMessage` to the `from` of the incoming message, with no owner action. The reply to the sender, which was mid-turn, was queued until the sender's turn cleared. Consequences adopted:
  - Leads end their turn while waiting on each other (never busy-wait), so queued messages are delivered.
  - Both leads run in the same permission mode: a session in a different mode holds cross-session messages for its user's approval.
  - Replies go to the incoming message's `from`; the PO gives the Architect its own session id in the brief.
  - Fallback if delivery ever fails (no reply after the other lead's turn ends): post the message as an issue comment and ask the owner for a one-word nudge; repeated failures are a reason to revisit D1.

### D5. Git topology
```
 main
  |
  +-- feature/<id>-<summary>        (one worktree, shared by PO and Architect)
         |
         +-- builder worktree A  --+
         +-- builder worktree B  --+--> merged into the feature branch by the Architect
```
- The PO and Architect share the feature worktree but edit disjoint files (D2 ownership). Each commits only its own files; the Architect alone commits code. If git reports a lock, the session waits and retries; neither runs history-rewriting commands.
- The PO creates the feature worktree with `git worktree add .claude/worktrees/<summary> -b <feature-branch> origin/main` (so the branch-name hook sees a compliant name), enters it with `EnterWorktree` `path`, and starts the Architect session with `use_worktree: false`, and the worktree path in the brief. Observed during implementation: a child session started with `use_worktree: false` from a session working in this worktree opened in the main checkout, so the Architect's first action is `EnterWorktree` with the path from its brief.
- Builders are started with `isolation: "worktree"`. That worktree is cut from `origin/main` by default (`worktree.baseRef: fresh`), so the Builder's first step is `git switch -c <feature-branch>-b<n> <feature-branch>`. Changing `worktree.baseRef` to `head` was rejected: it would change worktree creation for every session in the repo.
- The Architect merges each Builder branch locally into the feature branch (`git merge --no-ff`; conflicts should not occur with disjoint file sets), then removes the Builder worktree and deletes the Builder branch. Builder branches are never pushed.

### D6. Session start and feature intake
- The owner opens the PO session and gives it a feature. That request is the owner asking for the Architect session, so the PO starts it (fork of nothing, fresh brief: issue link, branch, worktree, `/team-architect`).
- One feature per lead pair at a time. A second feature waits in the issue backlog unless the owner opens a second pair.

### D7. Stage model and ownership of transitions
```
 Defined --> Designed --> [G1 proposal] --> Building --> Testing --+--> [G2 PR] --> Deploying --> Live on dev --> [G3 prod]
                                              ^                    |
                                              +---- fail ----------+
```
| Transition | Triggered by |
|---|---|
| Defined | PO (issue + branch + `proposal.md` + spec scenarios) |
| Designed | Architect (`design.md`, `tasks.md`) after the pros/cons exchange |
| G1 | Owner approves the proposal (PO asks) |
| Building | Architect starts Builders |
| Testing | Architect reports all tasks merged; PO starts the Tester |
| G2 | PO archives the change, pushes, opens the PR; owner reviews and merges |
| Deploying / Live on dev | Merge triggers the dev pipeline; PO starts DevOps to follow it and run the smoke check |
| G3 | Owner asks for a release; DevOps runs `prod-deploy` |

### D8. PR and CI watching
The PO opens the PR and binds it so the app wakes the PO for CI failures and review comments. The PO routes code problems to the Architect and pipeline or environment problems to DevOps; exit-code-3 environment steps go to the owner one at a time, as the environment rule requires.

## Risks / Trade-offs

- [No test runner, so the Tester's pass is weaker than human QA] -> The verdict lists exactly which checks ran per scenario; a test runner is proposed as a follow-up.
- [Two sessions in one worktree] -> Disjoint file ownership, commit only own files, wait on git locks, no history rewriting.
- [Peer messages may not wake an idle session] -> Spike in task 1 with a documented fallback.
- [Agents agree on something the owner would veto] -> Owner-only decision list, tie-breaks recorded in `design.md`, every stage reported on the issue.
- [Token cost of parallel Builders] -> The Architect starts Builders only for task groups with disjoint file sets that are large enough to justify one.
- [Role drift in long sessions] -> Playbooks restate boundaries; the state needed to resume lives in the change folder and issue.

## Migration Plan

Additive only: new files under `.claude/` and `docs/`. No deploy. Rollback is deleting those files and the CLAUDE.md pointer.

## Open Questions

- Which model each role uses (defaults to the parent's); can be tuned after the first real run without changing the specs.
