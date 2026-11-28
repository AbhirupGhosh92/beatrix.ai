## Why

Owner request on #148 (Fixes #148), after trying the fixed toolbar on dev: "stretch the editor full screen". The editor is a narrow centered card; for long documentation the owner wants to write in a full-screen view. The owner chose a toggle (a button), not a permanently wider card.

## What Changes

- A full-screen button in the editor toolbar expands the editor card (toolbar and text area) to cover the whole viewport, and the same button (or Escape) returns to the normal view.
- While full screen, the text area fills the remaining height and scrolls inside, the toolbar stays on top, the page behind does not scroll, and typing, selection and unsaved text are kept across the switch.
- Not remembered between visits. Works on phone and desktop, by keyboard and touch.
- No change to the stored post format, limits, API or readers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blog`: editor full-screen mode.

## Impact

`src/components/editor/` (`EditorToolbar.tsx`, `RichEditor.tsx`), `src/styles/components/rich-editor.css`, `CLAUDE.md`. No cloud, function, config or schema change.

## Out of scope

Hiding or moving the title and tags fields (assumption: full screen covers the editor card only, so the title and tags are not shown while it is on), remembering the choice, a wider default card, and other pages.
