# agent-team Specification

## Purpose
Defines the repository's autonomous agent team: the roles that take a change from idea to deploy, who owns and decides what, which gates stay with the owner, and how the team escalates and reports.

## Requirements

### Requirement: Team roles and documentation
The repository SHALL define five agent roles (Product Owner, Architect, Builder, Tester, DevOps) and SHALL document the workflow in `docs/AGENT_TEAM.md`, covering each role's responsibilities, inputs and outputs, who it communicates with, the escalation tiers, the tie-break rule, the stage model and the status report format, with diagrams.

#### Scenario: Roles are defined in the repository
- **WHEN** a contributor lists the agent definitions and lead instructions in `.claude/`
- **THEN** the Builder, Tester and DevOps roles exist as subagent definitions and the Product Owner and Architect roles exist as lead-session instructions

#### Scenario: Workflow is documented
- **WHEN** a contributor opens `docs/AGENT_TEAM.md`
- **THEN** it describes all five roles, the escalation tiers, the tie-break rule, the stage model and the report format, with at least one sequence diagram and one stage diagram

### Requirement: Two lead sessions
The Product Owner and the Architect SHALL each run as a full session that the owner can talk to directly, and the two SHALL exchange messages with each other without routing through the owner.

#### Scenario: Leads coordinate directly
- **WHEN** the Architect needs a business-rule answer for a design decision
- **THEN** it asks the Product Owner session directly and continues once answered, without messaging the owner

#### Scenario: Owner talks to either lead
- **WHEN** the owner sends a message to the Architect session
- **THEN** the Architect answers it and informs the Product Owner of any resulting change to scope or plan

### Requirement: Artifact ownership
The Product Owner SHALL own the GitHub issue, `proposal.md`, the spec scenarios, the project board status, the PR description and status reports; the Architect SHALL own `design.md`, `tasks.md` and the merge of Builder work into the feature branch. A lead SHALL NOT edit an artifact the other owns.

#### Scenario: Request to change the other lead's artifact
- **WHEN** the Architect finds an acceptance criterion in a spec scenario that cannot be met as written
- **THEN** it asks the Product Owner to change it and does not edit the spec itself

### Requirement: Spawning rights
Only the Architect SHALL start Builder subagents, and only the Product Owner SHALL start the Tester and DevOps subagents. Subagents SHALL NOT start other agents.

#### Scenario: Builders started by the Architect
- **WHEN** `tasks.md` is approved and contains tasks with disjoint file sets
- **THEN** the Architect starts one Builder per task group, each in its own worktree, and the Product Owner starts none

#### Scenario: Tester started by the Product Owner
- **WHEN** the Architect reports that all tasks are merged into the feature branch
- **THEN** the Product Owner starts the Tester

### Requirement: Builder isolation
Each Builder SHALL work in its own worktree on only the file set its task assigns, SHALL report its result to the Architect, SHALL NOT push to or merge into `main`, and SHALL NOT open a PR.

#### Scenario: Builder needs a file outside its set
- **WHEN** a Builder finds it must change a file not in its assigned set
- **THEN** it stops and asks the Architect instead of editing the file

#### Scenario: Builder has a business question
- **WHEN** a Builder needs a business-rule decision
- **THEN** it reports the question to the Architect, who obtains the answer from the Product Owner

### Requirement: Tester verdict
The Tester SHALL report to the Product Owner a verdict of pass or fail for every spec scenario of the change, with the evidence for each, using the checks the repository supports (typecheck, lint, build, `openspec validate` and a stated browser check). The Product Owner SHALL NOT open the PR without a pass on every scenario.

#### Scenario: A scenario fails
- **WHEN** the Tester reports a scenario as failed
- **THEN** the Product Owner routes a defect to the Architect or resolves a business-rule gap itself, and the Tester runs again after the fix

#### Scenario: Every scenario passes
- **WHEN** the Tester reports every scenario as passed with evidence
- **THEN** the Product Owner archives the change and opens the PR with the verdict in its Verification section

### Requirement: Owner gates are preserved
The team SHALL obtain the owner's decision for proposal approval before implementation, PR review and merge, every prod release, manual environment steps, and setting `allow_destructive` or `redeploy_all`. No agent SHALL approve or merge a PR, approve `prod-release`, or weaken, bypass or remove a check or gate.

#### Scenario: PR ready
- **WHEN** the PR is open and its checks pass
- **THEN** the Product Owner asks the owner to review and merge it and no agent merges it

#### Scenario: Prod release
- **WHEN** a change is live on dev
- **THEN** DevOps runs `prod-deploy` only after the owner explicitly asks for that release in chat

#### Scenario: A gate blocks progress
- **WHEN** a check such as the plan guard or branch-name check fails
- **THEN** the team fixes the cause or escalates to the owner and never disables or works around the check

### Requirement: Owner-only decisions
The team SHALL escalate to the owner, and SHALL NOT decide itself: a scope change after proposal approval, behavior that no spec, code or issue establishes, the owner's personal profile content, new ongoing cost or cloud resources, security, auth or stored-data changes beyond the approved proposal, and a failure that persists after 3 fix attempts.

#### Scenario: New cloud resource needed
- **WHEN** the design requires a new Cloud Function, GCP service, IAM binding or secret not named in the approved proposal
- **THEN** the Architect asks the owner before any Builder implements it

#### Scenario: Repeated failure
- **WHEN** the same test or pipeline failure remains after 3 fix attempts
- **THEN** the Product Owner escalates it to the owner with the attempts made

### Requirement: Team-level decisions
Decisions not reserved for the owner (library choice within the existing stack, file structure, task split, in-scope refactors, ordinary test, lint, build and dev pipeline failures with a clear cause) SHALL be made by the team without contacting the owner.

#### Scenario: Lint failure during build
- **WHEN** a Builder's work fails lint
- **THEN** the Architect has it fixed without informing the owner

### Requirement: Domain tie-break
When the leads disagree, the Product Owner SHALL decide questions of what and why and the Architect SHALL decide questions of how, recording the decision and the rejected option in `design.md`. A disagreement spanning both domains and unresolved after 2 rounds SHALL go to the owner as one message stating the context, both options, a joint recommendation, what is blocked and what continues.

#### Scenario: Technical disagreement
- **WHEN** the leads disagree on which component should hold new state
- **THEN** the Architect decides and records the decision and the rejected option in `design.md`, and the owner is not contacted

#### Scenario: Cross-domain deadlock
- **WHEN** a disagreement involves both scope and technical approach and is unresolved after 2 rounds
- **THEN** the owner receives one message with the context, both options, a joint recommendation, what is blocked and what continues

### Requirement: Stage-change reporting
The Product Owner SHALL report to the owner only when a change moves between stages (Defined, Designed, proposal gate, Building, Testing, PR gate, Deploying, Live on dev, prod gate), posting each report in its chat and as a comment on the issue, and SHALL send a push notification only when the owner's action is needed. There SHALL be no periodic digest, and Builders, the Tester and DevOps SHALL NOT contact the owner directly.

#### Scenario: Stage change
- **WHEN** the change moves from Building to Testing
- **THEN** the Product Owner posts one update with the stage, what is done, what is in progress, what is blocked and whether the owner is needed, both in chat and on the issue

#### Scenario: First test loop
- **WHEN** a change returns from Testing to Building for the first time
- **THEN** no report is sent, and a report is sent if it returns a second time

#### Scenario: Owner needed
- **WHEN** a gate or escalation needs the owner
- **THEN** the report is also sent as a push notification

### Requirement: Standing authorization for routine GitHub writes
The repository SHALL record the owner's standing authorization for the team to create issues and branches, comment on issues and open PRs in the standard templates without asking each time. The authorization SHALL NOT cover merging, approving, releasing or changing repository settings.

#### Scenario: Status comment
- **WHEN** the Product Owner posts a stage update on the issue
- **THEN** it does so without asking the owner first

#### Scenario: Action outside the authorization
- **WHEN** an agent would need to change a branch protection rule or GitHub environment
- **THEN** it does not do so and escalates to the owner
