# Spec-driven development (OpenSpec, from 1.2.0)

Specs live in `openspec/`: `openspec/specs/<capability>/spec.md` is the current behavior, and each in-flight change is `openspec/changes/<name>/` (`proposal.md`, `design.md`, `tasks.md`, spec deltas). Finished changes move to `openspec/changes/archive/`. Commands: `/opsx:explore`, `/opsx:propose <name>`, `/opsx:apply`, `/opsx:archive` (also `/opsx:sync`, `/opsx:update`); `openspec validate --all` checks the files. Keep the CLI current with `openspec update` after upgrading it.

## When a change needs a spec

- **Required**: new features, behavior changes, API/data/profile-schema changes, infrastructure or deployment pipeline changes, security/auth changes, and bugs whose fix changes documented behavior.
- **Exempt**: typos, copy edits to docs, dependency bumps, formatting, and fixes that restore documented behavior without changing it (cite the spec requirement in the issue instead).

## Mapping to the existing workflow

1. Create the GitHub issue first (see `github-workflow.md`); its ID names the branch.
2. Create the branch `<feature|bug|spike|hotfix>/<issue-id>-<summary>`.
3. Run `/opsx:propose <name>`; use the same summary as the branch. Reference the issue (`Fixes #<id>`) in `proposal.md`. The proposal's Why/What/Impact and the spec scenarios feed the issue's Background, Proposed change and Acceptance criteria. Review the proposal with the user before implementing.
4. Implement with `/opsx:apply`, checking off `tasks.md`. If the plan changes, update the artifacts (`/opsx:update`) before the code.
5. Before the PR is ready, run `/opsx:archive` so the spec deltas are merged into `openspec/specs/`, and commit the result. The PR's Changes section links the archived change; Verification lists the scenario checks actually run.
6. Update `CLAUDE.md`, `docs/DEPLOYMENT.md` and the README whenever the spec change makes them inaccurate.

## Writing specs

- Requirements use `SHALL`/`MUST`, each with at least one `#### Scenario:` using `WHEN`/`THEN`. Specify observable behavior, not implementation.
- Never invent behavior: write only what the code or the user's request establishes. State assumptions in `design.md`.
- Specs describe capabilities, not files; add new capability folders only when no existing one fits.
- Never edit `openspec/specs/` by hand for a change in flight; use the change's delta specs and archive. Direct edits are only for seeding baseline specs of existing behavior.
