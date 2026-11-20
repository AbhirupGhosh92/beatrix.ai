## Context

The floating toolbar (`FloatingToolbar.tsx`) lists bold, italic, link, headings, quote, lists and alignment. Tiptap's `StarterKit` (v3) already loads underline, strike, code and codeBlock, and `src/lib/blogDoc.ts` (`SIMPLE_MARKS`, `BLOCKS`) already stores and validates them, so this is a UI-only change.

## Goals / Non-Goals

**Goals:** underline, strikethrough, inline code, clear formatting and code block controls, with accessible names, `aria-pressed`, roving keyboard use, touch use, and a toolbar that fits 375px.
**Non-Goals:** new marks or nodes, schema, config, function, API or reader changes.

## Decisions

1. **Inline styles in the first group.** The group becomes Bold, Italic, Underline, Strikethrough, Inline code, Link, Clear formatting. Uses the existing `tool()` helper, `toggleUnderline`/`toggleStrike`/`toggleCode` and `s.underline/strike/code` in the `useEditorState` selector. Icons: `Underline`, `Strikethrough`, `Code`, `RemoveFormatting` from lucide-react. Rejected: a "more" overflow menu (hides controls from touch and the roving order for little gain).
2. **Clear formatting** runs `unsetAllMarks()` (removes bold, italic, underline, strike, code, link; text stays). It does not touch block types (headings, lists, alignment); the spec scenario covers text styles only. Rejected: `clearNodes()` as well, which would surprise authors by flattening headings and lists.
3. **Code block** is a block toggle (`toggleCodeBlock()`) with the `SquareCode` icon, placed in the block group after Quote, and added to the "+" insert menu in `InsertMenu.tsx` after Quote. The schema already forbids marks inside a code block, and Tiptap's codeBlock excludes marks, so applying it to formatted text drops them consistently.
4. **Toolbar inside a code block.** Today `shouldShow` hides the toolbar when `codeBlock` is active, so a code block could not be turned back into a paragraph with a pointer. Decision: show it in a code block, but disable every control except Code block (marks, headings, quote, lists, alignment and link are meaningless or invalid there). Disabled buttons are skipped by the existing `FOCUSABLE` selector, so roving still works. Rejected: keep hiding (no pointer way to toggle off).
5. **Layout at 375px.** `.editor-floating` already wraps (`flex-wrap`) and `.editor-bubble` is capped at `100vw - 1rem` with 40px buttons; the added buttons simply wrap onto more rows. No CSS change planned; the Tester confirms at 375px, and a small rule in `blog-editor.css` is added only if a row overflows.
6. **Keyboard shortcuts** (Mod-U, Mod-Shift-S, Mod-E) stay as Tiptap provides. Alt+F10 handling is unchanged since it targets `[data-floating-toolbar] button`.
7. **No change to** `blogDoc.ts` and its mirror, config, functions, API or `BlogContent` (it already renders these marks and `codeBlock`). Legacy posts are unaffected because nothing in storage or rendering changes.

## Risks / Trade-offs

- A wider toolbar wraps into more rows on phones: accepted, covered by a 375px check.
- A code block's `language` attribute stays null from the toolbar (no language picker): out of scope.
