# Design

## Context

See proposal.md for motivation. Current state that shapes the approach:

- Tailwind v4 (`@tailwindcss/postcss`) and daisyUI v5 are configured in CSS only. `src/index.css` starts with `@import "tailwindcss"` and `@plugin "daisyui"`, then declares the `beatrix-light` and `beatrix-dark` themes with `@plugin "daisyui/theme"`, a `@theme` font block, global element rules, effects and widget styles. The theme names are referenced by `ThemeToggle.tsx`.
- Most rules in `index.css` are **unlayered**, so they beat daisyUI's layered output. The file contains workarounds for that (`button.btn-primary` re-applies, `.button-*` + `btn-square`/`fixed`/`absolute`/`swap` re-applies). `CLAUDE.md` documents them.
- The light theme is selected through a long repeated selector, `:root:not([data-theme="beatrix-dark"], :has(input.theme-controller[value="beatrix-dark"]:checked))`.
- Third-party colors are hardcoded: `JsonEditor.tsx` defines two Monaco themes with hex values, and picks `darkTheme`/`lightTheme` from `@uiw/react-json-view` by an `isDarkTheme` state that watches the theme controller.
- Measured repetition: about 263 `className` uses across 22 components; recurring fragments are `bg-base-200 border border-base-300`, `font-display`, `text-brand*`, `text-xs/sm`, `badge`, `skeleton`.
- No test runner exists, so "no visual change" must be verified by inspection and by a mechanical computed-style comparison (see Decisions).

## Goals / Non-Goals

**Goals:**
- A predictable home for every style, with `src/index.css` reduced to ordered imports.
- Semantic classes that are the only way components get colors, surfaces, typography, borders and effects.
- Vendor UI driven by the same tokens, so a token change reaches Monaco and the JSON viewer.
- Each phase independently mergeable with identical rendering in both themes.

**Non-Goals:**
- Changing palette, fonts, copy, motion design or layout.
- CSS Modules, CSS-in-JS, removing Tailwind or daisyUI, or moving layout utilities into CSS.
- Restructuring components or props (only `className` strings and the `JsonEditor` theme wiring change).

## Decisions

**1. Directory structure (`src/styles/`).**

```
src/index.css            @import only, in cascade order
src/styles/
  tokens/   themes.css  fonts.css   (daisyUI theme plugins, @theme, light-theme variant)
  base/     elements.css            (body, headings, button, .lucide)
  components/ buttons.css surfaces.css badges.css navigation.css skills-tabs.css
              back-to-top.css google-signin.css ...   (one concern per file)
  effects/  hover.css  glitch.css  animations.css     (+ reduced-motion block)
  vendor/   monaco.ts  json-view.css                  (adapters)
```
Alternative: keep one file per component next to the component. Rejected because the goal is shared look; a flat concern-based tree makes the shared classes discoverable and prevents per-component copies.

**2. Compose with `@import` from `index.css`.** Tailwind v4 inlines CSS imports, so `@apply`, `@theme` and `@plugin` keep working in the split files and `layout.tsx` keeps importing one file. Alternative: import each CSS file from `layout.tsx`. Rejected because order becomes implicit and splits `@apply` away from the Tailwind context. Risk: `@plugin "daisyui"` and `@plugin "daisyui/theme"` inside an imported file must resolve; phase 1 proves this before anything else moves.

**3. Phase 1 is a verbatim, order-preserving move; layering is deferred to phase 2.** Rules stay unlayered in phase 1 so the cascade does not change at all. In phase 2, rules move into `@layer base/components` one concern at a time, and a workaround is deleted only when its computed-style snapshot is unchanged. Alternative: layer everything at once. Rejected as the single biggest regression risk with no test runner.

**4. Semantic class rule.** A utility group becomes a named class when it expresses visual identity (a surface, a card, a badge, display typography, brand text/borders, a hover effect) and appears at least three times or is part of a shared primitive. Classes are defined with `@apply` inside `@layer components` (phase 2) and use theme tokens only, never raw colors. Starting set, to be finalised from the audit task: `surface` (`bg-base-200 border border-base-300`), `surface-panel` (rounded, padded variant), `heading-display`, `text-brand*` (existing), `text-pain/gain` (existing), `meta-text` (`text-xs/sm` muted), plus the existing `button-*`, `hover-*`, `glitch-hover`. Structural utilities stay in JSX. Alternative: wrap everything in React primitives only. Rejected as the sole mechanism because it cannot style markup owned by daisyUI or third-party code; primitives (`ui/`) still carry behavior.

**5. Collapse the repeated light-theme selector into one custom variant.** Define the condition once (Tailwind v4 `@custom-variant`, for example `theme-light`) and use it in the split files. If the `:has()` form does not compile cleanly, keep the selector but define it once as a nested block per file. Dark-only rules continue to key off `beatrix-dark`.

**6. Vendor adapters are token-driven.**
- JSON viewer: `vendor/json-view.css` sets the library's CSS custom properties (`--w-rjv-*`) from theme tokens; `JsonEditor.tsx` stops importing `darkTheme`/`lightTheme` and drops the per-theme `style` prop. (Confirm the exact variable names from the installed version in the task.)
- Monaco: its theme API only accepts concrete color strings, so `vendor/monaco.ts` reads the computed token values at runtime, converts them to hex, and defines the Monaco themes from them, re-defining when the theme toggles. To keep appearance identical, the syntax colors currently hardcoded per theme become explicit tokens (`--color-syntax-key/-string/-number/-keyword`) in `tokens/themes.css` with the same values as today.
Alternative: leave Monaco hardcoded. Rejected because it breaks goal 3 (token change must reach third-party UI).

**7. Verification without a test runner.** Per phase, run `npm run check` and `npm run build`, then compare a computed-style snapshot: a browser-console snippet walks every element on `/` (and `/admin` where reachable) in each theme at 320, 768 and 1440px, records resolved values of the visual properties (color, background, border, font, box-shadow, transform, animation) keyed by a stable DOM path, and a diff against the pre-phase snapshot must be empty or explained. A manual look in both themes covers hover/focus/open states the snapshot cannot trigger.

**8. Docs.** `CLAUDE.md` (Styling and Component layout sections) and the README project-structure section are updated in the same PR as the code they describe, and the new `styling-system` spec is archived with the change.

## Risks / Trade-offs

- [Cascade change when rules are layered] → Layering is deferred to phase 2 (decision 3), rule-by-rule, with snapshot diffs and an easy revert per concern.
- [Nested `@plugin`/`@theme` in imported files fails to resolve] → Prove it first in phase 1 with only the theme files moved; fall back to keeping the plugin lines in `index.css`.
- [Semantic class names proliferate or overlap with daisyUI names] → Follow decision 4's usage threshold, prefix nothing that daisyUI already defines, and document the list in `CLAUDE.md`.
- [Monaco theme re-defined on every toggle causes flicker or stale editor] → Define both themes up front from tokens, re-define on the existing theme observer only, and check the editor in both themes.
- [Computed-style snapshot misses hover/focus/animation frames] → Pair it with a short manual state checklist per phase.
- [More files to navigate] → Concern-based names and the directory map in `CLAUDE.md`.

## Migration Plan

Three phases, each shippable on its own and reviewed with the manual and snapshot checks above. They can be commits on `feature/69-organise-styles` or separate PRs (each branch then needs its own issue ID per the branch-name rule; decide at apply time):
1. Move CSS verbatim into `src/styles/`; `index.css` becomes imports. Rollback: revert the commit.
2. Extract semantic classes, replace repeated lists in components, layer rules and remove proven-redundant workarounds.
3. Add vendor adapters and syntax tokens; simplify `JsonEditor.tsx`.
There is no data, infrastructure or deployment change, so the standard pipeline applies unchanged.

## Audit results (task 1.3)

Measured over `src/components` and `src/app` (263 `className` uses, 22 components). Candidate classes below meet decision 4's threshold with an **exact** match, so replacing them cannot change rendering. Near-matches that differ in a value (for example opacity 70 vs 80) stay separate classes; unifying them would change appearance and is out of scope.

| Class | Utilities it replaces | Uses |
|---|---|---|
| `surface` | `bg-base-200 border border-base-300` | 6 exact (plus ~8 variants that add radius, padding or opacity and keep those inline) |
| `edge-b` | `border-b border-base-300` | 4 |
| `text-muted` | `text-base-content/60` | 7 |
| `text-meta` | `text-sm opacity-70` | 3 |
| `text-meta-strong` | `text-sm opacity-80` | 3 |
| `heading-display` | `font-display uppercase tracking-wide` (non-heading elements; `h1`-`h6` already get this from the base rule) | 3 |

Below the threshold and left as utilities: `bg-base-100 font-mono text-sm` (2), `font-display text-brand` (2), `text-sm uppercase` (2). `text-brand*`, `text-pain/gain`, `button-*`, `hover-*` and `glitch-hover` already exist and stay. This is smaller than the starting set in decision 4: `surface-panel` is dropped (its variants differ too much) and `meta-text` is split into `text-meta` and `text-meta-strong`.

## Open Questions

- Whether the computed-style snapshot snippet should be committed (for example under `scripts/`) for reuse or kept as an untracked developer aid. This does not change the specs or tasks.
