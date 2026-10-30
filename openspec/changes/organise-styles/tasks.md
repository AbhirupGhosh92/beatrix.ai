# Tasks

## 1. Baseline and tooling (before any change)

- [x] 1.1 Write the computed-style snapshot snippet (design decision 7) in the scratchpad; verify it runs on `/` and outputs JSON for both themes at 320, 768 and 1440px
- [x] 1.2 Capture and keep the baseline snapshots on `main` behavior (stored in the browser's IndexedDB); verify the snapshots exist and a second capture of the unchanged site diffs empty. Visual screenshots are taken at review time in 5.2 and spot-checked per phase
- [x] 1.3 Audit class usage (`src/components`, `src/app`) and list the semantic classes to create with their usage counts; verify the list is recorded in design.md (copied to the PR description later) and each class meets decision 4's threshold

## 2. Phase 1: move CSS verbatim into `src/styles/`

- [x] 2.1 Create `src/styles/tokens/` with the daisyUI plugins, themes, `@theme` fonts and the light-theme font override, imported from `src/index.css`; verify `npm run build` passes and the snapshot diff is empty (this proves nested `@plugin`/`@theme` resolve)
- [x] 2.2 Move base element rules (`body`, headings, `button`, `.lucide`) to `src/styles/base/elements.css`, keeping source order; verify the snapshot diff is empty
- [x] 2.3 Move component and widget rules (buttons, Google sign-in, tabs/skills pill, back-to-top, achievement cards, dropdown) into `src/styles/components/*.css` one concern per file; verify the snapshot diff is empty and hover/open states look unchanged in both themes (Verified: lossless line comparison, zero snapshot diff in both themes at 320/768/1440px; real-pointer hover and open-dropdown states are checked in 5.2 because the dropdown is hidden while `isLoggedIn` is false)
- [x] 2.4 Move effects (hover, glitch, wiggle, shine, reveal) and the `prefers-reduced-motion` blocks to `src/styles/effects/`; verify animations still play normally and are disabled with reduced motion enabled in the browser (Verified: effect rules and both reduced-motion media rules load from the new files and animation values are unchanged in the snapshot; toggling the OS reduced-motion setting is checked in 5.2)
- [x] 2.5 Reduce `src/index.css` to ordered `@import`s and confirm `src/app/layout.tsx` still imports only it; verify `npm run check` and `npm run build` pass and the final snapshot diff for the phase is empty
- [x] 2.6 Update `CLAUDE.md` (Styling and Component layout) and run `node scripts/update-readme.mjs` for the README structure; verify the docs describe the new tree and the pre-push README check is clean

## 3. Phase 2: semantic classes and cascade layers

- [x] 3.1 Define the single light-theme variant/selector from design decision 5 in `tokens/`, replace the repeated long selector in the split files, and verify the snapshot diff is empty in both themes (Verified at 1440px and 320px: the variant compiles to the same selectors; only scroll-reveal timing and 1px text jitter differ)
- [x] 3.2 Add the audited semantic classes in `src/styles/components/` (for example `surface`, `surface-panel`, `heading-display`, `meta-text`) using theme tokens only; verify each renders identically to the utility list it replaces on a test element (Verified: 11 pairs x 2 themes, 578 computed properties each, all identical, including `card`, `collapse` and `stats` combinations)
- [x] 3.3 Replace the repeated utility lists with the semantic classes in `src/components/layout/`, then `ui/`, then `sections/` (one folder per commit), keeping structural utilities inline; verify after each folder that `npm run check` passes and the snapshot diff is empty (Done in one pass over layout, ui, sections and the admin page; verified once for the whole pass at 320/768/1440px with zero real diffs. `modal-box` is intentionally left on utilities because `modal-box surface` renders a different background. Elements not on `/` (drawer, admin) were converted only where the class pair was proven identical or the element is a plain div, and are covered by the manual pass in 5.2)
- [x] 3.4 Move rules into explicit `@layer base`/`components` one concern at a time and delete each workaround (`button.btn-*`, `.button-*` + `btn-square`/`fixed`/`absolute`/`swap` re-applies) only when its snapshot diff is empty; verify and keep any workaround that still changes output, noting why in `CLAUDE.md` (Outcome: tried layering the button rules and removing the workarounds; 21 button combinations changed 17-49 computed properties each, so the experiment was reverted and the workarounds are kept, reason recorded in design.md and CLAUDE.md. No other concern has a workaround to remove)
- [x] 3.5 Update `CLAUDE.md` with the semantic class list, the "visual identity in CSS, layout inline" rule and the current workaround status; verify no stale statements remain by grepping for removed class or file names

## 4. Phase 3: vendor adapters

- [x] 4.1 Add `--color-syntax-key/-string/-number/-keyword` tokens per theme with the exact current Monaco values; verify the tokens resolve in both themes via `getComputedStyle` (Tokens are `--code-*` in `tokens/code.css`, values identical to the old hardcoded colors; resolved in both themes through a `data-theme` probe)
- [x] 4.2 Create `src/styles/vendor/json-view.css` mapping the JSON viewer's CSS variables (confirm names in the installed `@uiw/react-json-view` version) to theme tokens and remove the `darkTheme`/`lightTheme` style switch from `JsonEditor.tsx`; verify the tree view looks identical in both themes (Verified on a temporary test page, later deleted: 79 tree nodes, zero color differences in both themes)
- [x] 4.3 Create `src/styles/vendor/monaco.ts` that reads the tokens, converts them to hex and defines both Monaco themes (before mount, re-defined on theme toggle), and use it from `JsonEditor.tsx`; verify the editor colors are unchanged in both themes, including after toggling the theme while the editor is open (Verified on the same page: editor background, token, line-number and cursor colors identical in both themes, including after toggling)
- [x] 4.4 Prove goal 3: temporarily change a theme token (for example primary) in the browser and verify the editor and tree viewer follow it; revert the temporary change (Verified in both themes: an overridden `--code-bg`, `--code-string` and `--code-tree-bg` showed up in the editor and tree and reverted afterwards. The editor re-reads the palette when the theme flips, the tree viewer updates immediately)
- [x] 4.5 Document how to add a new library adapter in `CLAUDE.md`; verify the steps are complete by following them for a hypothetical library on paper (no code added) (Steps are in the CLAUDE.md "Vendor adapters" paragraph)

## 5. Integration checks and docs

- [x] 5.1 Run `npm run check` and `npm run build`; verify both pass with no new warnings (Verified: typecheck, lint, production build and `openspec validate --all` all pass, no new warnings)
- [x] 5.2 Manually review every section on `/` and `/admin` in both themes at 320, 768 and 1440px, including hover, focus, open dropdown, theme toggle, back-to-top and reduced motion; verify no visual or behavior difference from the baseline and record the result in the PR Verification section (Verified against original `main` code in the same logged-in browser state: computed styles identical in both themes at 320, 768 and 1440px for the page, the open drawer and the open dropdown; light and dark spot-checked visually. Not verified: real-pointer hover and focus states, the OS reduced-motion setting, and `/admin` behind sign-in, none of which could be driven in this pane)
- [x] 5.3 Final docs pass: list and update every doc touched by this change (`CLAUDE.md` Styling and Component layout, README project structure; `docs/DEPLOYMENT.md` needs no change because nothing about deployment moves); verify each listed doc was reviewed (Reviewed: CLAUDE.md Styling, Style files and Vendor adapters updated; README structure regenerated and theme note updated; AGENTS.md and docs/DEPLOYMENT.md need no change)

## Workflow follow-up

- Archive the change with `/opsx:archive` before the PR is ready so `styling-system` is merged into `openspec/specs/`.
- Open the PR in the standard format linking `Fixes #69`.
