## Summary
<!-- One or two sentences: what changes and why. -->

## Linked issue
<!-- Fixes #<id> (the branch name must also use this id). -->

## Type
<!-- bug | feature | spike | hotfix | chore -->

## Problem / Context
<!-- What was wrong or missing? Include the root cause for bugs. -->

## Changes
<!-- Bullet list by file or component. Say what each change does, not just that it exists. -->
-

## How to test
<!-- Numbered steps a reviewer can follow, with the expected result. -->
1.

## Verification
<!-- Tick only what you actually ran, and paste or summarise the result. State plainly what you did not run. -->
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manually checked in the browser (both themes for UI changes)

## Screenshots / recordings
<!-- Required for UI changes; write "n/a" otherwise. -->

## Risks and rollout
<!-- Side effects, migrations, env or Terraform changes, deploy order. Write "none" if none. -->

## Checklist
- [ ] Branch name is `<feature|bug|spike|hotfix>/<issue-id>-<summary>`
- [ ] Only functional components and hooks (no class components)
- [ ] Infrastructure changes are in `terraform/`
- [ ] `profile.example.json` and `profile.ts` updated together if profile fields changed
- [ ] Docs (`CLAUDE.md`, README) updated if behavior or structure changed
