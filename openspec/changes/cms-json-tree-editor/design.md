# Design

## Context

`components/ui/JsonEditor.tsx` already has a Code / Tree toggle, search, Collapse / Expand and a full screen portal. Its Tree view renders `@uiw/react-json-view`, which is read-only. The CMS page keeps the whole file as one string and derives validity, dirtiness and Save from it. The resume structure editor and the tracker's tailor JSON use the same component. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- One document string stays the source of truth; Tree is a different editor of it.
- No change to the CMS page's save, reset or validation logic.

**Non-Goals:**
- Drag-and-drop, undo/redo, schema-aware fields, replacing Monaco.

## Decisions

1. **Editable tree lives inside `JsonEditor`, not on the page.** The toggle, search, expand controls and full screen already exist there, and the full screen requirement already says "the chosen code or tree view". A page-level toggle would duplicate all of it. Alternative: a second toggle on `/admin/cms` that swaps editors; rejected as a duplicate control.
2. **New `JsonTreeEditor` component.** It parses `value`, renders rows and calls `onChange(JSON.stringify(next, null, 2))`. It keeps no second copy of the document. Edits are immutable updates by path. Alternative: make `@uiw/react-json-view` editable; rejected, its edit support is limited and it cannot change types or reorder.
3. **Read-only keeps the current viewer.** When `readOnly` is set, `JsonView` renders as today, so the `vendor/json-view.css` adapter and its spec stay valid.
4. **Starting view prop.** `JsonEditor` gets `defaultView?: 'code' | 'tree'` (default `'code'`). The initial state is Tree only if requested and the text parses. The CMS page passes `'tree'`. Other callers are unchanged and open on Code, but their Tree view is now editable.
5. **Drafts and types.** A number input keeps its text while typing and is committed as a number only when it parses; an unfinished entry such as `-` is held in the row, not written. Changing a type converts sensibly (string "12" to number 12, anything to string via its text, to map or array starts empty) and never invents data.
6. **Formatting on edit.** Writing back uses two-space `JSON.stringify`, which matches what the CMS already shows and saves; a Tree edit therefore reformats the text, like Format does.
7. **Keys.** Rows use stable ids so renaming a key does not remount the input and lose focus. A rename to an existing sibling key is rejected inline and the text is not changed.
8. **Accessibility and motion.** Nested rows use `role="tree"` / `treeitem` with labelled inputs; collapse is instant, so no animation needs a reduced-motion variant. Styles use the semantic classes and theme tokens, never raw colors.

## Risks / Trade-offs

- [Very large files render many rows] → Maps and arrays below the first level start collapsed, as the current Tree does.
- [Tree edits reformat the text] → Same two-space format the CMS already uses; documented in the spec scenario "Switch after an edit".
- [Other editors' Tree view changes from read-only to editable] → They still open on Code and still validate on submit; Tree edits go through the same `onChange`.
