## Why

The owner checked the Medium-style editor (#143) on dev and asked for more text style options, including code and strikethrough. The floating toolbar dropped the underline, strikethrough and inline-code buttons (they remain only as keyboard shortcuts), and a code block has no control.

Fixes #145.

## What Changes

- The floating toolbar gains underline, strikethrough, inline code and clear formatting; a code block is offered from the toolbar and from the "+" insert menu.
- Active styles show as pressed; all controls have accessible names and work by keyboard and touch.
- No change to the stored post format, the config, the functions or the API: the formats already exist in the document schema.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `blog`: the editor's floating toolbar and insert menu offer more text styles.

## Impact

`src/components/blog/FloatingToolbar.tsx`, `RichEditor.tsx`, `src/styles/`, `openspec/specs/blog/spec.md`, `CLAUDE.md`. No cloud, IAM, secret or data change.

## Assumption to confirm at proposal review

"More options" means the formats the editor already stores. Highlight, subscript, superscript, text color, fonts and tables would widen the stored format in `src/lib/blogDoc.ts` and `functions/src/blogDoc.ts`; they are out of scope unless the owner asks for them at approval.

## Out of scope

New stored marks or nodes (highlight, subscript, superscript, color, font, size, tables); reader changes.
