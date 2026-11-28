## Context

The editor (`src/components/editor/`, host-independent behind `RichEditorHost`) today spreads its controls over four places: `EditorActionBar` (always visible, but only undo and redo, plus table commands while the cursor is in a table), `FloatingToolbar` (a `BubbleMenu`, shown only while text is selected: styles, color, highlight, sub/superscript, headings, lists, alignment, quote, code block, link), `InsertMenu` (a `FloatingMenu` "+", shown only on an empty line: image, rule, lists, quote, code block, table, task list) and `ImageToolbar` (a `BubbleMenu` on a selected image). The owner wants one persistent toolbar with every control visible, like the Tiptap home page demo.

**Why dev looks unchanged (investigation).** In this branch `RichEditor.tsx` mounts `EditorActionBar` unconditionally, so undo and redo are always on screen; nothing hides or feature-flags it, and no CSS hides it. Everything else new is only reachable after an action the owner may not have taken: color, highlight, sub/superscript, alignment and headings appear only when text is selected, and table and task list only through the "+" on an empty line. Separately, dev is deployed only by a push to `main` (`deploy-dev.yml`); PR #149 is not merged, so unless the branch was deployed by hand with `dev-deploy`, dev still runs the code from before #148 (the Medium-style editor with no undo/redo bar at all). I cannot see which commit dev serves from here; the PO should check the latest Deploy dev run and its commit. Either way the discoverability problem is real and this change fixes it.

No cloud, function, config, schema, API or stored-format change is needed (confirmed: the work is in `src/components/editor/` and CSS).

## Goals / Non-Goals

**Goals:** a bordered editor card with one sticky toolbar showing every control, grouped, wrapping on narrow screens; active, disabled, accessible-name, tooltip, keyboard and touch behavior; removal of the floating selection toolbar and the "+" menu; the contextual image bar kept.
**Non-goals:** any stored-format, limit, reader, title or tags change; new formatting features; other surfaces.

## Decisions

### D1. One `EditorToolbar`, built from the existing code
New `EditorToolbar.tsx` replaces `EditorActionBar.tsx`, `FloatingToolbar.tsx` and `InsertMenu.tsx` (all three files are deleted). Their code is moved, not rewritten: the button factory (`editor-tool`, `aria-pressed`, `aria-label`, `title`, `onMouseDown preventDefault` so the selection survives), `ColorPicker` (presets, native color input, Apply, Remove, Close), `normalizeLink` and the link form, the Upload / By URL image form, the table commands with their `canMergeCells` / dry-run disabling, and the `useEditorState` selector, merged into one selector. Shared pieces go to `ToolbarParts.tsx` (`ToolButton`, `ColorPicker`, `LinkForm`, `ImageUrlForm`) so the toolbar file stays readable. `RichEditor.tsx` mounts `<EditorToolbar>` above the content and no longer mounts `FloatingToolbar`, `InsertMenu` or `EditorActionBar`. `ImageToolbar` stays as is (a `BubbleMenu` with its own plugin key, acting on the selected image).

### D2. Controls and groups (all visible, in this order)
1. History: undo, redo (disabled from `editor.can()`).
2. Block type: a `<select>` (Paragraph, Heading 1, 2, 3).
3. Text styles: bold, italic, underline, strikethrough, inline code, clear formatting.
4. Color: text color and highlight (each opens the color panel), subscript, superscript.
5. Lists: bulleted, numbered, task list, and the list-style `<select>` (bullet or numbered styles; enabled only inside a list).
6. Alignment: left, center, right, justify.
7. Blocks: block quote, code block, horizontal rule.
8. Insert: link (opens the link form), image (Upload button and By URL form).
9. Table: insert (3 x 3 with header row), then add row above/below, add column left/right, delete row, delete column, merge cells, split cell, delete table; the commands are always shown and disabled outside a table (the spec's "Table commands" scenario).
Every button has an icon, `aria-label`, a `title` tooltip that includes its shortcut where there is one, and `aria-pressed` for toggles. Disabled controls use the native `disabled` attribute.

### D3. Panels as a row, not popovers
The color, highlight, link and image-by-URL forms open as one panel row directly under the toolbar rows, inside the same sticky container (`openPanel: 'color' | 'highlight' | 'link' | 'image' | null`, one at a time; Escape or Close returns focus to the editor). Rejected: popovers anchored to each button (positioning, overflow clipping inside a sticky container and 375px width all need floating-ui work; the old floating bar already needed `flip`/`shift` for this). A row costs vertical space only while open and is trivially responsive.

### D4. Card, sticky and wrapping
`.rich-editor` becomes the card: border, radius, `bg-base-100`; the toolbar is its first child with `position: sticky; top: var(--editor-toolbar-top, 0)`, a bottom border and the card background so text scrolling under it is hidden; the content area has padding. The toolbar uses `flex-wrap` with `gap`, so on 375px it wraps onto several rows and the page never scrolls sideways; buttons keep a 2.25rem tap target. Sticky needs no ancestor with `overflow` other than visible: the Builder checks `BlogPage`/`BlogEditor` ancestors and the page layout, and if the page has its own sticky header sets `--editor-toolbar-top` to that header's height so the two do not overlap. The panel row and the upload status stay inside the card. The hint line under the editor is reworded (shortcuts and Alt+F10) since the floating and "+" instructions are gone.

### D5. Keyboard, focus and touch
The toolbar is one `role="toolbar"` (`aria-label="Formatting"`) with a roving tabindex: one Tab stop, Left/Right (and Up/Down inside wrapped rows) move through the controls in DOM order, Home/End jump, the `<select>`s keep their own Up/Down and are skipped by roving only for Left/Right when they hold focus on an open list. Escape in the toolbar or a panel returns focus to the editor. The editor's Alt+F10 handler is kept and now focuses the toolbar's current control (and still the image toolbar when an image is selected); the "plus button" branch is removed. Mouse and touch use `onMouseDown preventDefault` so tapping a button does not blur the selection; touch targets keep the existing `.editor-tool` size. The `coarse pointer` placement logic of the floating bar is deleted with it.

### D6. What is removed
`FloatingToolbar.tsx`, `InsertMenu.tsx`, `EditorActionBar.tsx` and their CSS (`.editor-floating`, `.editor-insert*`, `.editor-bubble`, `.editor-actionbar` and the "+" styles; table-control styles are reused). `@tiptap/react/menus` stays imported only by `ImageToolbar` (`BubbleMenu`); `FloatingMenu` is no longer used. The "Insert menu" requirement is removed in the spec, so no migration is needed (nothing stored changes).

## Risks / Trade-offs

- **Many controls on one bar** (about 40 buttons): wraps to 2 or 3 rows on desktop widths and 5 or more at 375px, which takes vertical room. Mitigation: grouping with separators, a compact button size, and the sticky bar's height capped (the Builder reports the height at 375px and 1280px); if it exceeds a third of a phone screen the table-command group collapses behind one "Table" button on narrow screens only, a UI-only fallback the PO would need to approve (scope), so the Builder asks first.
- **Sticky behind another sticky header**: handled by `--editor-toolbar-top` (D4).
- **Regression of keyboard flows** (Alt+F10, Escape, roving): Tester scenarios listed in tasks.
- **Dev not showing the branch** is a deploy matter, not a code defect (see Context).

## Migration

None; stored data and APIs are unchanged.

## Open questions

None for the owner. For the PO: confirm which commit dev currently serves (Context).
