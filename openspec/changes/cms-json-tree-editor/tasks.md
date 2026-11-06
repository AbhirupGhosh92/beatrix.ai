# Tasks

## 1. Tree editor component

- [x] 1.1 Add `src/components/ui/JsonTreeEditor.tsx` (rows with key, type selector and value input; add, remove, array move up/down; duplicate-key rejection; Collapse / Expand and search props). Verify `npm run typecheck` and `npm run lint` pass.
- [x] 1.2 Add the value-type conversion and path-update helpers in a pure module under `src/lib/` and verify with a short script run through `node --experimental-strip-types` (the repo targets Node 22, which supports it) that string to number keeps a number, key order is preserved, and an empty or duplicate rename is refused, and that the type-change confirmation is wired in the component.

## 2. Wire into the JSON editor and CMS page

- [ ] 2.1 In `JsonEditor.tsx` render `JsonTreeEditor` in Tree view (keep `JsonView` when `readOnly`), keep the search and Collapse / Expand controls working, and add `defaultView`. Verify in the browser: toggle keeps content, full screen keeps the Tree view, invalid text shows the fix-in-Code message.
- [ ] 2.2 Pass `defaultView="tree"` from `src/app/admin/cms/page.tsx` and verify: a valid file opens on Tree, an invalid one on Code, an edit shows Unsaved Changes, Reset reverts, and Save writes the edited JSON.
- [ ] 2.3 Check both themes and widths 320px to 1920px, and keyboard use of the rows. Run `npm run check` and `npm run build`.

## 3. Docs and specs

- [ ] 3.1 Update the JSON editor notes in `CLAUDE.md` (editable tree, `defaultView`, read-only keeps the viewer) and `README` if its structure section changes (`node scripts/update-readme.mjs`); `docs/DEPLOYMENT.md` needs no change. Verify `git diff` shows only those docs.
- [ ] 3.2 Run `openspec validate --all` and verify it passes.

## Workflow follow-up

- Archive the change with `/opsx:archive` before the PR is ready.
