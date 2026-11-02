# Tasks

## 1. Tracking and baseline

- [x] 1.1 Create the GitHub issue (feature, standard template, linking this change) and the branch `feature/<issue-id>-ui-overhaul`; verify the branch name passes `.claude/hooks/check-branch-name.py` and put the issue id into `proposal.md` (`Fixes #<id>`)
- [x] 1.2 Capture "before" screenshots of the public home page in both themes at mobile and desktop widths (signed-in pages `/resume-builder`, `/job-tracker`, `/admin/*` need a Google sign-in and are not baselined; they are checked after the change only); the screenshots were taken in the browser pane and are kept in the session transcript, not as files
- [x] 1.3 Grep `src/` for every class and keyframe to be retired (`glitch-hover`, `button-glitch`, `hover-neon`, `hover-3d`, `aura`, `text-rotate`, `animate-ping`, `swap-rotate`, `cute-wiggle`, `shine-sweep`, `wibble`, `menu-drop`, `menu-item`, `reveal-item`) and record each usage; verify the list matches design.md decision 6

## 2. Shared tokens (palette, geometry, type, motion)

- [x] 2.1 Rewrite `src/styles/tokens/themes.css`: identical radii, border width, sizes, depth and noise in both themes; neutral surfaces, one indigo accent, retuned status colors, `secondary`/`accent` roles neutral or aliased; verify `npm run build` passes and both themes render with the same geometry (computed `border-radius` and `border-width` equal across themes on a button and a card)
- [x] 2.2 Rewrite `src/styles/tokens/fonts.css` and the font link in `src/app/layout.tsx` to one family in normal case; delete the light-theme font/case overrides; verify Network shows only the new family loading and `h1`, `button` computed `text-transform` is `none` in both themes
- [x] 2.3 Add motion tokens (`--motion-fast`, `--motion-base`, `--ease-standard`) in `tokens`; verify they resolve in devtools on `:root`
- [ ] 2.4 Retone `src/styles/tokens/code.css` for both themes to the new palette; verify the CMS Monaco editor and the JSON tree viewer follow the theme toggle with readable colors
- [x] 2.5 Update `CLAUDE.md` Styling and Style files sections for the new tokens, fonts and palette; verify no statement about pink/cyan/yellow, Orbitron, Rajdhani, Quicksand or Fredoka remains (`grep`)

## 3. Shared classes and buttons

- [x] 3.1 Update `base/elements.css`, `components/typography.css`, `surfaces.css` and `text-colors.css`: drop uppercase, make `text-brand` a single value per theme without a `theme-light` switch, alias `text-brand-2/-3`, keep `text-pain/-gain` legible; verify contrast of each class on `base-100` and `base-200` is at least 4.5:1 in both themes with a script or devtools check
- [x] 3.2 Rewrite the global `button` rule and `.button-*` in `components/buttons.css` as flat color/border/background rules keeping the lift, glow and shine hover (no glitch, no uppercase) and a visible focus ring; keep the `btn-square`, `fixed`, `absolute` and `swap` re-apply rules; verify the button matrix in both themes (every combination has a background/border/text, no variant lost)
- [ ] 3.3 Retone `components/google-signin.css`, `release-notes.css` and `skills-tabs.css` (pill keeps sliding at base speed); verify the sign-in button, release modal text contrast and tab selection in both themes
- [x] 3.4 Record the final class semantics (`button-*` meanings, `text-brand*`) in `CLAUDE.md`; verify the text matches the CSS

## 4. Remove decorative effects (CSS)

- [x] 4.1 Restore `effects/hover.css` (`hover-neon`, `hover-subtle`, recolored) without `cute-wiggle`/`glitch-hover`, keep `effects/glitch.css` deleted; verify `npm run build` passes and grep finds no `glitch`/`cute-wiggle` in `src/`
- [ ] 4.2 Restore `components/back-to-top.css` spring pop-in without `wibble`, and `components/navigation.css` and `effects/reveal.css` as before; verify by scrolling the home page that the back-to-top button pops in near the bottom without wobbling and the dropdown opens with its drop and stagger
- [ ] 4.3 Restore `effects/reduced-motion.css` minus the glitch entries and add the new scroll-animation components; verify with devtools "prefers-reduced-motion: reduce" that nothing moves and all content is visible
- [x] 4.4 Update `CLAUDE.md` and the `src/index.css` import list for the removed and renamed style files; verify the Style files section lists exactly the files in `src/styles/` (`ls`)

## 5. Remove effect hooks from components

- [x] 5.1 `Hero`: remove only `glitch-hover` (keep the ping dot and `text-rotate`); verify the hero rotates its roles and the title has no glitch on hover
- [ ] 5.2 `Avatar`, `BeyondCode`, `UpcomingProjects`: keep `aura`, `hover-3d` and `animate-ping`; verify cards and avatar render at 320px, tablet and desktop with no layout shift and tilt on hover
- [ ] 5.3 `Navbar`, `DrawerMenu`, `ThemeToggle`: remove `glitch-hover` only, keep `hover-neon` and `swap-rotate` with Sun/Moon icons, leave the theme controller, saved `theme` key, pre-paint script and mount sync untouched; verify toggling, reload persistence, the OS-preference default and no flash on load in both themes
- [ ] 5.4 Review the remaining components (`Stats`, `About`, `Experience`/`AchievementCard`, `Skills`, `Education`, `Footer`, resume builder, job tracker, admin pages) for leftover effect classes or per-component color hacks and align them to the shared classes; verify with grep and a visual pass that the draggable before/after cards, tabs, tables and forms still work
- [ ] 5.5 Update `CLAUDE.md` Content and Component sections (Hero, Avatar, ThemeToggle, BackToTop, `AchievementCard`) for the new behavior; verify against the code

## 5a. Scroll animations (Framer Motion)

- [x] 5a.1 Add `framer-motion` with pnpm (updates `pnpm-lock.yaml`; `package-lock.json` is not tracked); verify the package is in `package.json` and typecheck passes
- [x] 5a.2 Add `src/components/ui/motion.tsx` with `Reveal` (same props), `Stagger`/`StaggerItem`, `Parallax` and `ScrollProgress`, all honoring `useReducedMotion()`; remove the old CSS-transition `Reveal`; verify typecheck and lint pass and existing `Reveal` usages compile unchanged
- [ ] 5a.3 Apply them: `ScrollProgress` in the page, scroll-linked fade/scale/lift on the hero, parallax on the avatar, staggered reveals on section headings and card grids; verify in the browser that sections animate in while scrolling, the hero responds to scroll position and reverses on scroll up, and content is visible with reduced motion on
- [x] 5a.4 Document the motion components and scroll animation in `CLAUDE.md`; verify against the code

## 6. Audit and integration

- [x] 6.1 Run `npm run typecheck`, `npm run lint` and `npm run build`; verify all pass with no unused-import errors
- [ ] 6.2 Review every page in both themes at 320px, tablet and desktop widths in the browser against the "before" screenshots; verify layout, content and behavior are unchanged, only the look differs, and there is no horizontal scroll
- [ ] 6.3 Run a contrast pass (4.5:1 text, 3:1 large text) and a keyboard-focus pass on all pages in both themes; verify results and fix failures, noting the numbers in the PR
- [ ] 6.4 Confirm the confirmed accent hue with the user (open question in design.md) and, if changed, adjust only the color tokens; verify build and contrast again
- [x] 6.5 Docs to update: `CLAUDE.md` (Styling, Style files, Content, Responsive layout), README if it describes the look or the style file list (run `scripts/update-readme.mjs` if the structure section changed), and `docs/DEPLOYMENT.md` only if affected (none expected); verify with grep that no stale design references remain

## Workflow follow-up

- Run `openspec validate --all`, then archive with `/opsx:archive` so the `design-language` capability is created and the `styling-system` requirements are updated, and commit the result before the PR is ready.
- Open the PR in the standard format (Verification lists only the checks actually run, with before/after screenshots).
