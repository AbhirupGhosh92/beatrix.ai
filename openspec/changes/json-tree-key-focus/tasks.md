# Tasks

## 1. Fix row identity (owner: builder-1; file set: `src/components/ui/JsonTreeEditor.tsx`)

- [x] 1.1 In `TreeNode`, key child rows by their position in the unfiltered `entries` (not by key text, not by filtered position), keep the `index` prop behavior, and add a short comment on why (a rename must not remount; removal shifts open state, accepted). Do not touch `src/lib/jsonTree.ts`. Verify `npm run check` passes.

## 2. Verification (owner: Tester via the PO; no file changes)

- [ ] 2.1 In the browser on `/admin/cms` (Tree view of a file with a map entry that has children): click a key field and type several characters in a row; the field stays focused, each character appears, and the Code view shows the new key after each keystroke (scenario "Typing a multi-character key"). Confirm the bug reproduces on `main` first if feasible.
- [ ] 2.2 Rename an expanded entry with children: it stays expanded with the same children (scenario "Renaming an expanded entry").
- [ ] 2.3 Type an empty key and a duplicate key: the inline error shows and the Code view is unchanged (scenario "Invalid key").
- [ ] 2.4 Regression: with a search term active rename a visible key; remove a map entry and an array item, move an array item, change a type, add an entry; all still work. Note which rows are expanded after a removal (decision 3).

## 3. Docs (owner: architect; file set: `CLAUDE.md`)

- [x] 3.1 Add one sentence to the JSON tree editor notes in `CLAUDE.md` (rows are keyed by position so renaming a key keeps focus and expanded state). `docs/DEPLOYMENT.md` and the README need no change. Run `openspec validate json-tree-key-focus --strict`.
