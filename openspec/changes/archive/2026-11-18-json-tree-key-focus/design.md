## Context

`JsonTreeEditor.tsx` renders each child row as `<TreeNode key={`${k}`} .../>`. For a map entry `k` is the key text. `DraftInput` for the key commits `renameKey` on every valid keystroke, so the document's key (and therefore the React `key`) changes on each character. React treats it as a different element, unmounts the row and mounts a new one: the `<input>` loses focus, the `DraftInput` draft and the row's `openState` are lost. For arrays `k` is the index, so arrays never had this problem.

## Root cause check

Confirmed by code reading, not yet in a browser: nothing else in the path can blur the input (`onChange` -> `update` -> `onChange(stringify(...))` re-renders the same component type; `renameKey` keeps entry order, so the renamed entry stays at the same position). The only identity change across a keystroke is the React `key`. There is no DOM test environment in the repo and the CMS needs an authenticated admin session, so the before/after browser check is task 2.1 (Tester) rather than done here.

## Decisions

1. **Stable row identity by position, no library.** Key a child row by its position among its parent's entries (`String(position)`) instead of by key text. `renameKey` rebuilds the object in the same order, so a rename keeps the position and React keeps the same row: input, focus, caret, draft and `openState` survive. Arrays already use the index, so maps and arrays now behave the same. No third-party library is needed (the owner allowed one only if identity alone does not fix it). Rejected: a tree/form library (large dependency and restyling for a one-line identity bug); per-row generated ids in a ref/state (reconciling ids on add/remove/move needs callbacks through every row and ref writes during render, which the `react-hooks` lint rule forbids).
2. **The position is the index in the unfiltered entries**, not in the search-filtered list, so a search never changes a row's identity. Compute it from `entries` before filtering (the existing `index` prop already uses `entries.findIndex`).
3. **Open-state drift (checked, accepted).** With position keys, removing a map entry makes the rows after it inherit the expanded or collapsed state of the row before them (arrays have always behaved this way). Moving array items swaps content but keeps each position's open state. This is cosmetic: only which rows are expanded, never data (values come from the document, not row state), and no spec requirement covers it. Rejected as out of scope: lifting open state or stable ids. A key field's draft is cleared on blur, so it cannot leak across rows. A code comment records this.
4. **No change to `src/lib/jsonTree.ts`**: `renameKey` already preserves order, refuses empty and duplicate keys and returns the same root for an unchanged key. Invalid keys never commit, so the document does not change and the inline error stays (`DraftInput` keeps showing the draft while it is invalid).

## Risks

- Row state shifting after a removal (decision 3).
- Shared component: the CMS editor, resume structure editor and tracker tailor JSON all pick up the fix; none changes its API.
