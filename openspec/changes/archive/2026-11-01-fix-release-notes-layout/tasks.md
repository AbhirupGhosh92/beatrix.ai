# Tasks

## 1. Version row and button

- [x] 1.1 In `src/components/layout/ReleaseNotes.tsx`, add bottom padding to the version wrapper so it clears the back-to-top button; verify in the browser at 320px, 1280px and 1920px that the two buttons' bounding boxes do not overlap when scrolled to the bottom and that the version is still the last element
- [x] 1.2 Make the version button render small and ghost-styled despite the global `button` rule; verify its computed height is that of an extra-small button

## 2. Modal readability and padding

- [x] 2.1 Set the modal box text colour to the page text colour; verify the title and notes are clearly readable in the light theme and still readable in the dark theme (screenshots of both)
- [x] 2.2 Position the close button in the top-right corner without taking a row, using the existing `.button-*` + `absolute` pattern; verify the title's top offset equals the box padding and the button's computed position is `absolute`
- [x] 2.3 Hide the backdrop button's visible text while keeping its accessible name; verify no "close" bar shows and a backdrop click and Escape still close the modal

## 3. Checks and docs

- [x] 3.1 Run `npm run typecheck`, `npm run lint` and `npm run build`; verify all pass
- [x] 3.2 Update `CLAUDE.md` (Releases and the version modal section) with the clearance and text-colour notes if they changed; `docs/DEPLOYMENT.md` and the README need no change (no pipeline or script change), and confirm that with a grep

## Workflow follow-up

- Create the GitHub issue and the `bug/<issue-id>-<summary>` branch before implementing; replace `#<issue-id>` in `proposal.md`.
- Run `/opsx:archive` before the PR is ready.
