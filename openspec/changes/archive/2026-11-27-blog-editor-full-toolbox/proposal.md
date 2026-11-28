## Why

Owner request (issue #148, Fixes #148): "use tiptap for the editor, full functionality with image upload". The blog editor is already Tiptap but lacks common editor tools (tables, task lists, color, highlight, sub/superscript, undo/redo buttons) and its image handling is basic (one file at a time, no drop or paste, no progress, no resize, alignment or caption).

## What Changes

- Editor: table (insert, add/delete row and column, delete table), task list, highlight and text color from a fixed palette, subscript, superscript, undo and redo buttons.
- Images: drag-and-drop and paste upload, multi-file picker, per-file progress and errors, size (small, medium, full), alignment (left, center, right), editable alt text and a separate optional caption.
- Owner additions: free color (a validated `#rrggbb` value plus the palette), merged table cells (stored as bounded column and row spans), image editing (crop, rotate, flip, reset, producing a new uploaded image), and a host-independent editor component because "this will be the single editor for all documentation". Migrating other surfaces to it is not part of this change (assumption: the owner will name them later).
- The closed post document gains whitelisted nodes, marks and attributes (`blogDoc.ts` and its mirror in `functions/src/blogDoc.ts`); the author view and public reader render them through lookup tables. Existing posts are unaffected.
- The legacy Markdown conversion notice no longer lists tables and task boxes as lost once they are supported.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blog`: editor tools, image handling and stored-format whitelists.

## Impact

`src/components/blog/`, `src/lib/blogDoc.ts`, `functions/src/blogDoc.ts`, `src/app/api/blog/[id]/images`, `src/styles/components/blog-content.css`, `CLAUDE.md`. No new cloud resource, function or config key is expected.

## Out of scope

Video or iframe embeds, free-form fonts, column resizing, image filters, galleries, find and replace, collaborative editing, moving other documentation surfaces onto the editor.
