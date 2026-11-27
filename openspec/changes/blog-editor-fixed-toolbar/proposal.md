## Why

Owner feedback on dev for #148 (Fixes #148): the editor still looks like the old Medium-style editor, so the new tools are not visible, and the owner wants it "like what we see on the Tiptap home page": one persistent toolbar above the editing area with every control visible. The new tools (tables, colors, task lists, image controls) sit in popovers and a contextual bar that are hard to discover.

## What Changes

- The editor becomes a bordered editor card with a fixed toolbar on top that is always visible (sticky while the page scrolls) and groups every control: undo and redo, text styles (bold, italic, underline, strikethrough, inline code, clear formatting), highlight, text color, subscript, superscript, block type (paragraph, headings 1 to 3), bulleted, numbered and task lists with their styles, alignment, block quote, code block, horizontal rule, link, image (upload or URL), table with its row, column, merge and split commands. Each button shows its active state, has an accessible name and a tooltip, and the toolbar wraps on narrow screens instead of scrolling the page.
- The floating selection toolbar and the "+" insert menu are removed; their controls move into the fixed toolbar. The contextual image bar (size, alignment, alt, caption, edit) stays, because it acts on the selected image.
- No change to the stored post format, limits, API or readers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blog`: editor layout and controls.

## Impact

`src/components/editor/` (toolbar, `RichEditor.tsx`, removal of `FloatingToolbar.tsx` and `InsertMenu.tsx`), `src/styles/components/rich-editor.css`, `CLAUDE.md`. No cloud, function, config or schema change.

## Out of scope

Changing the stored format, the reader pages, the title field and tags area (assumption: the title stays a separate large field above the card), new formatting features, and moving other pages onto the editor.
