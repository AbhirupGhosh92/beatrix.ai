## Why

In the JSON editor's Tree view, typing in a key field loses the cursor after every character, so the owner must click the field again to keep typing. Each keystroke renames the key, and the row is identified by the key text, so React rebuilds the row and its input loses focus, draft and expanded state.

## What Changes

- Editing a key in the Tree view keeps focus, caret and the row's expanded state across keystrokes.
- Invalid renames (empty or duplicate key) keep showing the inline error and change nothing.
- No change to values, add, remove, move or type change, or to the Code view.
- Third-party library: not expected; the Architect confirms in `design.md` whether row identity alone fixes it.

Fixes #136

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-cms`: adds a requirement for key editing in the Tree view.

## Impact

`src/components/ui/JsonTreeEditor.tsx` (possibly `src/lib/jsonTree.ts`); used by the CMS editor, the resume structure editor and the tracker tailor JSON.

## Out of scope

Redesigning the Tree view, undo/redo, the Code (Monaco) view.
