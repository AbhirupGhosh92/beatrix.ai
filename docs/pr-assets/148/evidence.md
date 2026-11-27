# Evidence for #148 (blog editor full toolbox)

No screenshots: the editor (`/blog`) needs a signed-in author with `blog:write` and the private Cloud Functions, which do not exist in a local worktree (no `.env`, no backend). Sign-in was not bypassed. The editor scenarios below are NOT VERIFIABLE locally and must be checked on dev after merge.

## Commands run by the Tester on HEAD e1501ab (all pass)

- `npm run typecheck`, `npm run lint`: no errors
- `npm run check:blog`: `blog contract: OK` (tables with colspan/rowspan, 12 columns, 100 rows, task items, `#rrggbb` normalisation, invalid colors refused, unknown attributes refused)
- `openspec validate blog-editor-full-toolbox --strict`: valid (before archiving); `openspec validate --all` earlier: 21 passed, 0 failed
- `diff src/lib/blogDoc.ts functions/src/blogDoc.ts`: empty
- `npm run build`: compiles and prints the route table. One earlier run exited 1 only on Next's security-advisory upgrade notice (Next `^16.4.3` is unchanged versus `main`; the Tester's own run exited 0).

## Contrast (WCAG, computed from the CSS values, not from rendered pages)

Fix rounds 1 and 2 changed the per-theme shades of the nine text-color presets (the stored value stays the preset hex). Independent recomputation: 108 pairs (9 presets x 12 backgrounds: reader light, dark, paper, site light and dark, table header, editor code and pre). Pairs below 4.5:1: 0. Minimum 4.51:1 (light gray on the site-light inline-code background).

## Not verified (need a signed-in author on dev)

Table insert/merge/split, task list, color and highlight, sub/superscript, undo/redo, image drop, paste, multi-upload, progress, rejected file, size/alignment/alt/caption, crop/rotate/flip/reset, edit-failure and image-limit cases, the shared editor in light and dark at 375px and desktop, and the readers in light, dark and paper themes. Also not run in a browser: the pasted-HTML `style` color check (only read in code: the parse rule reads `data-color` only).
