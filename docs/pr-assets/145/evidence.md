# Evidence for #145 (editor text style options)

No screenshots: the author editor needs a session with `blog:write` and the Cloud Functions are not reachable from a local checkout, so the changed toolbar could not be rendered locally. To be checked in a browser on dev after merge.

## Command results (Tester, branch head ccfa2a1)
- `npm run check` (typecheck + lint): pass
- `npm run check:blog`: "blog contract: OK"
- `npm run build`: pass
- `openspec validate editor-text-style-options --strict`: valid; `openspec validate --all`: 21 passed, 0 failed

## Diff scope
Changed: `FloatingToolbar.tsx` (+44), `InsertMenu.tsx` (+5), `CLAUDE.md`, OpenSpec files. Unchanged: `blogDoc.ts` and its `functions/` mirror, config, API, functions (`check:blog` confirms the schema).

## Code review (Tester)
Underline, strikethrough, inline code (`toggleUnderline`/`toggleStrike`/`toggleCode`), clear formatting (`unsetAllMarks`) and code block (`toggleCodeBlock`) have aria-labels and `aria-pressed`; inside a code block every control except Code block is disabled; roving focus skips disabled buttons; the "+" menu has a Code block item.

## Not verified
Browser behavior in both themes at 375px and desktop (the first toolbar group now has 7 buttons and may wrap or overflow on a phone), keyboard and touch use, save and reopen with each style, clear formatting leaving headings, lists and alignment intact (Tiptap's `unsetAllMarks` source was not read), and a legacy post.
