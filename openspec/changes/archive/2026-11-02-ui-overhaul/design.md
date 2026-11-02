# Design

## Context

Everything visual is already routed through tokens and shared classes (see CLAUDE.md "Styling" and "Style files"), which is what makes a whole-site restyle tractable:

- Two daisyUI themes in `tokens/themes.css` differ in palette, `--radius-*`, `--border` and (via `tokens/fonts.css`) the font family and text case. The light-only differences are keyed on `:root:not([data-theme="beatrix-dark"], :has(input.theme-controller...:checked))` and the `theme-light` variant.
- Visual identity comes from semantic classes: `surface`, `edge-b`, `text-muted`, `text-meta*`, `heading-display`, `text-brand`, `text-brand-2`, `text-brand-3`, `text-pain`, `text-gain`, `button-primary/-secondary/-accent`, `hover-neon`, `hover-subtle`, `glitch-hover`, `button-glitch`.
- Effects live in `effects/*`, `components/buttons.css`, `back-to-top.css`, `navigation.css`. A few appear directly in JSX as daisyUI classes: `hover-3d` (Avatar, BeyondCode, UpcomingProjects), `text-rotate` and `animate-ping` (Hero), `animate-ping` (BeyondCode), `swap swap-rotate` (ThemeToggle), `aura` (Avatar).
- The global `button` rule, the `.button-*` rules and their re-apply workarounds are unlayered and fragile (moving them into a layer once broke every variant). `button`s are all globally styled `btn`.
- Monaco and the JSON viewer follow the `--code-*` tokens.

See proposal.md for the motivation and scope, and `specs/design-language/spec.md` for the requirements.

## Goals / Non-Goals

**Goals:**
- One shape/type/motion layer shared by both themes, with a palette layer that is the only thing a theme sets.
- Keep the semantic-class API (`surface`, `text-brand`, `button-*`) so the 60-plus component usages need no edit where the class still makes sense.
- Remove the effect hooks from JSX where they cannot be neutralised in CSS.

**Non-Goals:**
- No layout, information architecture or content changes, no new components, no rename sweep of class names across the codebase.
- No move off daisyUI or Tailwind.

## Decisions

**1. Two layers of tokens: shared geometry, per-theme color.** Radii, border width, sizes, font families and motion tokens are set once (on `:root`, or identically in both `@plugin "daisyui/theme"` blocks), and only `--color-*` and `--code-*` differ. Geometry: `--radius-box` 0.5rem, `--radius-field` 0.375rem, `--radius-selector` 0.375rem, `--border` 1px, `--depth: 0`, `--noise: 0`. Alternative considered: keep per-theme geometry values but make them equal; rejected because duplicated values drift, which is how the themes diverged.

**2. Palette: neutral plus one accent, mapped onto daisyUI roles.** `primary` is the single accent (indigo, oklch hue about 265, tuned per theme so both pass contrast: a darker indigo in light, a lighter one in dark). `secondary` and `accent` become neutral/muted roles (a slate secondary, and `accent` aliased to the same indigo or a tint) instead of new hues; `neutral` is slate. Surfaces: light `base-100` white, `base-200` near-white gray, `base-300` hairline gray; dark `base-100` a neutral near-black (about #0b0b0f-ish with zero blue cast), `base-200` a step lighter, `base-300` a border-strength gray. Status colors keep their hues, retuned for contrast. Alternative: keep a muted version of the old pink; rejected as the user asked for a clean professional look. The accent hue is an assumption to confirm with the user during review of this proposal.

**3. Keep class names, change meaning.** `text-brand` stays the accent text color, now one value per theme with no `theme-light` switch (the new accent is dark enough in light, light enough in dark). `text-brand-2` and `text-brand-3` become aliases of muted/accent text so existing usages keep rendering sensibly; they are removed later in a follow-up if desired, to keep this diff reviewable. `button-primary` is the solid accent button, `button-secondary` an outlined neutral button, `button-accent` a quiet (ghost/tonal) button; names are unchanged so the 60-plus usages need no edit.

**4. Typography: one family, normal case.** Use a single variable sans (Inter, via the existing Google Fonts link replacing the four families; if self-hosting via `next/font` is preferred during implementation that is equivalent). `--font-display` is the same family. The `uppercase tracking-*` in `h1..h6`, `button`, `.button-*` and `.heading-display` is dropped, and the light-theme `text-transform` and font overrides in `tokens/fonts.css` are deleted. Alternatives: Geist (newer, same effect) or the system UI stack (zero download, but less consistent across platforms); Inter is chosen for widespread familiarity and good small-size legibility.

**5. Motion: keep the previous effects, drop glitch and wiggle, add scroll animation.** The shared tokens `--motion-fast` 120ms, `--motion-base` 200ms, `--ease-standard` are used for state transitions. The previous hover and ambient effects stay, recolored by the palette: button/`hover-neon` lift, glow and shine sweep, `hover-3d` on cards and avatar, avatar `aura`, `text-rotate` hero roles, `animate-ping` dots, the dropdown drop and item stagger, `reveal-item`, the back-to-top spring pop-in and the skills pill slide. Removed: `glitch` (title, buttons), `cute-wiggle` and `wibble`. Alternative considered: dropping everything decorative (the first proposal); rejected on the user's request.

**5a. Scroll animation with Framer Motion.** Add `framer-motion` (pnpm and npm lockfiles both updated). A small `src/components/ui/motion.tsx` (client) exposes: `Reveal` (reimplemented with `motion.div` and `whileInView`, `once`, fade + 24px rise + slight scale, stagger via `delay`), `Stagger`/`StaggerItem` for children, `Parallax` (`useScroll` + `useTransform` for translateY), and `ScrollProgress` (a fixed top bar bound to `scrollYProgress` through `useSpring`). The hero fades, scales and lifts as the page scrolls away (`useScroll` on the section), the avatar has gentle parallax, and section headings and card grids use staggered reveals. All use `useReducedMotion()` to render static content. The old CSS `useInView` reveal is replaced by this; `Reveal`'s props stay the same so existing usages need no edit. Alternative: pure CSS `animation-timeline: scroll()`; rejected for browser support and because the user asked for Framer Motion.

**6. Effect hooks removed in JSX, classes retired in CSS.**
- `Hero`: drop only `glitch-hover`; keep the ping dot and `text-rotate`.
- `Avatar`: keep `aura` and `hover-3d`; add scroll parallax.
- `BeyondCode`, `UpcomingProjects`: keep `hover-3d` and `animate-ping`.
- `AchievementCard`: keeps its `reveal-item` stagger.
- `Navbar`: drop `glitch-hover`; `DrawerMenu` keeps `hover-neon`.
- `ThemeToggle`: keep the `swap` button, checkbox, `theme-controller` and storage behavior exactly; keep `swap-rotate` and use Sun/Moon icons.
- `glitch-hover`, `button-glitch` and `cute-wiggle` are deleted; `hover-neon` and `hover-subtle` stay.

**7. Buttons: simplify but keep the unlayered workaround structure.** The global `button`/`.button-*` rules stay unlayered (documented as fragile) and keep the glow, lift and shine (lose only uppercase). Variants are rewritten as flat color/border rules that use theme tokens. The re-apply rules for `btn-square`, `fixed`, `absolute`, `swap` remain. Moving them into `@layer` is deliberately not attempted here; it is a separate refactor with its own matrix test. A verification matrix (primary/secondary/accent/ghost x light/dark x default/hover/focus/disabled) is part of the tasks.

**8. Third-party and special surfaces follow tokens.** `tokens/code.css` is retoned to the new neutral and indigo palette for both themes (editor, JSON syntax, tree viewer); `vendor/*` needs no structural change. `google-signin.css`, `release-notes.css` and `skills-tabs.css` are retoned and de-effected only (the Google button keeps Google's branding colors where its guidelines require them).

**9. Order of work.** Tokens first (so the whole site changes at once and can be reviewed), then shared classes and buttons, then effect removal in CSS, then JSX effect hooks, then contrast/responsive audit, then docs. This keeps each step reviewable in the browser.

## Risks / Trade-offs

- [The unlayered button rules may regress when edited] → Test the full variant matrix in both themes before and after, and keep the workaround rules intact.
- [Accent contrast on tinted surfaces (badges, tonal buttons) may fail 4.5:1] → Use `*-content` pairs chosen by contrast check; run an automated contrast pass over each page in both themes, as the project did before.
- [Scroll animation can hurt performance or hide content] → Animate only transform and opacity, play `once`, honor reduced motion, and check that content is visible with JS animation disabled for the first paint (initial state not `opacity: 0` on the server).
- [Dropping a font family or changing case changes line breaks and heights, so layouts may reflow, especially at 320px] → Review all pages at 320px, tablet and desktop widths in both themes.
- [A class retired while still used silently loses its style] → grep every retired class and keyframe name across `src/` before deleting, and rely on `npm run build` plus a visual pass.
- [Turbopack can fail to resolve moved or added style files] → Restart the dev server and clear `.next` after adding or removing files in `src/styles/`.
- [The pre-paint theme script and the unchecked server-rendered checkbox could flash] → Leave `ThemeToggle` logic and the layout script untouched; change only icons and transitions.
- [Retiring the brand colors leaves `text-brand-2/-3` aliases that look redundant] → Accepted for this change; removal is a follow-up.

## Migration Plan

Pure front-end change deployed through the normal pipeline (merge to `main` deploys dev). No data or infrastructure changes. Rollback is reverting the merge. Preview on dev before any prod release.

## Open Questions

- `wibble` (back-to-top periodic wobble) is treated as a wiggle and removed; the spring pop-in stays.

- Confirm the accent hue (indigo recommended; teal or a muted version of the old pink are alternatives). Changing it later only edits the color tokens.
- Inter via the Google Fonts link versus `next/font` self-hosting; either satisfies the spec.
