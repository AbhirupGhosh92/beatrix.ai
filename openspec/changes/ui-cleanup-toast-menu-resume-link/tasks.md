# Tasks

## 1. Snackbar exit animation

- [x] 1.1 Wrap the `SnackbarHost` items in `AnimatePresence` with `motion` enter/exit/layout, honoring reduced motion via the safe hook; remove the unused `snackbar-in` CSS. Verify `npm run typecheck` and `npm run lint` pass and, in the browser, a snackbar fades out, siblings slide up, and with reduced motion emulated nothing animates.
- [x] 1.2 Update the Snackbars section of `CLAUDE.md` (exit animation, framer-motion). Verify the text matches the code.

## 2. Account menu from config

- [x] 2.1 Add the `DropdownItem` type to `src/data/profile.ts`, the new `dropdownItems` to `profile.example.json` (Profile and Settings disabled, Log out enabled), and `normalizeDropdownItems` in `profileService.ts` with the legacy fallback. Verify `npm run typecheck` passes and a legacy-shaped profile loads with only Log out enabled.
- [x] 2.2 Add `visibleMenuItems` next to `src/lib/drawer.ts`; rewrite `NavbarDropdown` to render from it (links via `next/link` or external anchor, sign-out via the action; hide the button when nothing is visible). Verify in the browser: enabled link navigates, disabled entry is hidden, sign-out still ends the session, role-gated entry is hidden for a lower role.
- [x] 2.3 Update `CLAUDE.md` (profile nav config, drawer/menu helper). Verify the profile example documents the new keys.

## 3. Linked resume in the job tracker

- [x] 3.1 In `functions/src/applications.ts` return `resumeTitle` from the resume listing in `applicationList`; add `resumeTitle` to `ApplicationSummary`. Verify `npm run functions:build` and `npm run typecheck` pass and `scripts/check-functions.sh` still passes.
- [x] 3.2 Add a "Resume" column to `ApplicationTable` (title linking to `/resume-builder?open=<id>`, blank when none); tolerate a missing `resumeTitle`. Verify in the browser: a tailored application shows its resume title and link, an unlinked or deleted-resume application shows a blank cell; `npm run lint` and `npm run build` pass.
- [x] 3.3 Update the Job tracker paragraph of `CLAUDE.md` (resume column, `resumeTitle`). Verify against the code.

## 4. Integration

- [ ] 4.1 Run `npm run check`, `npm run build` and `openspec validate --all`; do one manual pass of all three behaviors in both themes at phone and desktop width. Verify the PR's Verification section lists only what was run.
- [x] 4.2 Docs to update: `CLAUDE.md` (done in 1.2, 2.3, 3.3); `docs/DEPLOYMENT.md` and the README need no change unless the pipeline or scripts changed (confirm, since `functions/` is touched).

## Workflow follow-up

- Run `/opsx:archive` before the PR is ready.
