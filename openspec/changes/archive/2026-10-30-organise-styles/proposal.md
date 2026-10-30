# Proposal

## Why

All styling lives in one 671-line `src/index.css` (themes, fonts, global rules, effects, one-off widgets) while the 22 components carry about 263 inline Tailwind class lists. Visual fragments repeat (`bg-base-200 border border-base-300` about 10 times, `font-display` 13, `text-brand` 21), so restyling means editing many components, new components can drift from the app's look, and third-party UI (Monaco, `@uiw/react-json-view`) is themed with hardcoded colors in `JsonEditor.tsx` instead of the app's theme tokens. Issue #69.

## What Changes

- Split `src/index.css` into `src/styles/` with five areas: `tokens/` (daisyUI themes, fonts), `base/` (element rules), `components/` (semantic classes), `effects/` (hover, glitch, animations) and `vendor/` (third-party adapters). `src/index.css` keeps only ordered `@import`s and is still imported by `src/app/layout.tsx`.
- Introduce semantic classes for visual identity (colors, surfaces, typography, borders, effects), for example `surface`, `card`-level wrappers, `badge`, `heading-display` and the existing `text-brand-*`, and replace the repeated utility lists in components with them. Structural utilities (`flex`, `grid`, `gap-*`, spacing, responsive layout) stay inline.
- Put all rules in explicit cascade layers and remove the "re-apply" workarounds that exist only because unlayered rules beat daisyUI's layered ones, where this can be shown to leave both themes unchanged.
- Add vendor adapters so Monaco and the JSON viewer take their colors from the shared theme tokens instead of hardcoded hex values in `JsonEditor.tsx`.
- Phased delivery: (1) move CSS with no visual change, (2) extract semantic classes and resolve layering workarounds, (3) vendor adapters. Each phase leaves the site visually identical in both themes.
- No change to palette, fonts, copy, behavior or routes. No **BREAKING** changes.

## Capabilities

### New Capabilities
- `styling-system`: how the app is styled: where styles live, token-driven theming for both themes, semantic classes that give every component the same look and hover/motion behavior, and how third-party UI inherits the app's tokens.

### Modified Capabilities
<!-- None: no existing capability's requirements change. -->

## Impact

- `src/index.css` (reduced to imports) and a new `src/styles/` tree.
- `src/components/**` and `src/app/**` markup: class lists change, no logic or props change.
- `src/components/ui/JsonEditor.tsx`: Monaco theme definitions and `JsonView` style source move to token-driven adapters.
- `src/app/layout.tsx`: unchanged import path.
- `CLAUDE.md` Styling section and the component-layout notes need updating.
- No new dependencies, no backend, infrastructure or deployment changes. Verification is manual (both themes, 320px to 1920px) plus `npm run check` and `npm run build`, since there is no test runner.
- Risk: moving rules into cascade layers changes cascade order site-wide; mitigated by phasing and per-phase manual review.
