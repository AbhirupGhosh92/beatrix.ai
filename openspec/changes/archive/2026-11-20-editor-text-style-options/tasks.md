## 1. Toolbar and insert menu (owner: builder-1)

File set: `src/components/blog/FloatingToolbar.tsx`, `src/components/blog/InsertMenu.tsx`, `src/styles/components/blog-editor.css` (only if a row overflows at 375px).

- [x] 1.1 `FloatingToolbar.tsx`: add `underline`, `strike`, `code`, `codeBlock` to the `useEditorState` selector; add Underline, Strikethrough and Inline code buttons after Italic, and Clear formatting (`unsetAllMarks()`) after Link in the first group, via `tool()` (accessible name, `title`, `aria-pressed`). Verify: select text, each style applies and shows pressed (spec: Apply a style; Clear formatting).
- [x] 1.2 `FloatingToolbar.tsx`: add a Code block toggle (`toggleCodeBlock()`) after Quote; change `shouldShow` to stay visible in a code block and disable every control except Code block while `codeBlock` is active (design decision 4). Verify: paragraph to code block and back to paragraph from the toolbar (spec: Code block).
- [x] 1.3 `InsertMenu.tsx`: add a "Code block" item after Quote on an empty line (`toggleCodeBlock()`). Verify: the empty line becomes a code block (spec: Code block).
- [ ] 1.4 Keyboard and touch: confirm Alt+F10 and arrow roving include the new buttons and skip disabled ones; 40px targets; toolbar fits at 375px in light and dark (add CSS only if it overflows). Verify: browser check at 375px and desktop (spec: Keyboard and touch).
- [ ] 1.5 Save and reopen a post using each style and a code block, and open an existing legacy post. Verify: styles persist, no loss, no validation error (spec: Apply a style; Earlier posts).
- [x] 1.6 `npm run check` passes.

## 2. Docs (owner: architect)

- [x] 2.1 Update `CLAUDE.md` (Personal blog: floating toolbar controls and the code block toggle in the "+" menu); the `blog` spec is updated at `/opsx:archive`.
- [x] 2.2 `openspec validate editor-text-style-options --strict` passes.
