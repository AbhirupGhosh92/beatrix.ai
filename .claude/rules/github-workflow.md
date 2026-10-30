# Issues and Pull Requests (humans and AI agents)

Every issue and PR must have a detailed description in the standard format. Do not write one-liners. The GitHub templates in `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md` are the source of truth for the sections; fill every section (write "n/a" or "none" rather than deleting it).

## Issues (create one before any branch)

Sections, in order:

- **Bug**: Summary, Type, Background / Context, Steps to reproduce, Current behavior, Expected behavior, Root cause, Proposed fix, Acceptance criteria, Affected areas, Out of scope, Risks / Notes.
- **Feature**: Summary, Type, Background / Context, Current behavior, Expected behavior, Proposed change, Acceptance criteria, Affected areas, Out of scope, Risks / Notes.
- **Chore / Spike**: Summary, Type, Background / Context, Proposed change / Questions to answer, Acceptance criteria, Affected areas, Out of scope, Risks / Notes.

- The issue ID is used in the branch name: `<feature|bug|spike|hotfix>/<issue-id>-<summary>`. `chore` is an issue/PR type only, not a branch prefix: chore work uses `feature/`, and research uses `spike/`.
- Search for existing issues first to avoid duplicates.

## Pull requests

Sections, in order: Summary, Linked issue (`Fixes #<id>`), Type, Problem / Context, Changes, How to test, Verification, Screenshots / recordings, Risks and rollout, Checklist.

- Verification lists only the checks actually run (`npm run typecheck`, `npm run lint`, `npm run build`, manual browser check) with their results. State plainly what was not run; never claim a check that was not run.
- Open a PR only when asked. `main` is protected; never push to it.
- AI agents append the attribution lines required by their session (commit trailer, PR footer) after the template content.
