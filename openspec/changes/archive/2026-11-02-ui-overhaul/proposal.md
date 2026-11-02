# Proposal

## Why

The site has two unrelated personalities: a rounded, pastel, "cute" light theme (Fredoka/Quicksand, 2px borders, pill radii, jelly wiggle) and a square, neon, uppercase cyberpunk dark theme (Orbitron/Rajdhani, glitch, glow, shine sweep). Toggling the theme changes the whole design language, not just the colors, and the effects (glitch, wiggle, neon glow, 3D tilt, aura, ping, wibble) read as playful rather than professional for a site aimed at recruiters and now also hosting the resume builder and job tracker. The next phase is a UI overhaul to one clean, minimalist, professional design language, with the two themes differing only in color and contrast.

Fixes #98.

## What Changes

- One shared design language for both themes: the same typeface, corner radius, border width, spacing, elevation and motion in light and dark. Only the color tokens (surfaces, text, borders, accent, status colors) differ between themes.
- New palette: neutral surfaces and text, a single restrained accent (indigo/blue) plus the existing semantic status colors; hairline 1px borders; modest radius; near-flat elevation. Dark is a true neutral dark, not black-navy. The old pink/cyan/yellow/purple brand colors are retired.
- Typography: one sans family for body and headings in both themes, normal case, hierarchy by size and weight. Orbitron, Rajdhani, Fredoka and Quicksand are no longer loaded.
- Motion: keep the previous style's hover and animation effects (neon glow, shine sweep and lift on buttons, 3D tilt on cards and avatar, avatar aura, rotating hero roles, ping status dots, menu and list reveal animations), recolored by the new palette. Remove only the glitch effect and the wiggle effects (title glitch, jelly `cute-wiggle`, back-to-top `wibble`). Add Apple-style scroll animations built with Framer Motion (`framer-motion`, a new dependency): scroll-linked parallax, fade/scale and staggered reveals, and a scroll progress indicator, all disabled under reduced motion.
- Keep all existing components, sections, routes, content, theme toggle behavior (including the pre-paint script and `localStorage` key) and the draggable before/after cards. Only their appearance and effects change.
- Simplify the fragile unlayered button styling where the new design allows it, re-testing every button class in both themes.
- Update the `styling-system` requirement "Refactoring preserves appearance and behavior" (this change intentionally changes appearance) and the reduced-motion requirement to match the new effect set.
- Re-run the contrast audit in both themes (4.5:1 text, 3:1 large text).

Out of scope: layout and information architecture changes, new pages or components, copy or profile content changes, new third-party dependencies beyond a web font and `framer-motion`, the `/admin` data behavior, any backend, infrastructure or deployment changes, and the Monaco/JSON viewer behavior (they only follow the retoned `--code-*` tokens).

## Capabilities

### New Capabilities
- `design-language`: the shared visual language of the site: one set of shape, type, spacing and elevation tokens for both themes with only color differing; the accent and neutral palette rules with contrast minimums; and the rules for motion (subtle, consistent transitions, no decorative effects).

### Modified Capabilities
- `styling-system`: replace "Refactoring preserves appearance and behavior" (a deliberate appearance change is now the goal, so it is replaced by a requirement that the structure, content and behavior stay while the look changes) and update "Reduced motion is respected" to the new set of transitions.

## Impact

- `src/styles/` (all files): `tokens/themes.css`, `tokens/fonts.css`, `tokens/code.css`, `base/elements.css`, `components/*` (buttons, navigation, back-to-top, skills tabs, release notes, google sign-in, text colors, surfaces, typography), `effects/*` (glitch.css removed, hover.css and reveal.css reduced, reduced-motion.css updated), `vendor/*` (follow tokens).
- `src/app/layout.tsx`: Google Fonts link (single family) and font tokens.
- Components using effect hooks: `Hero` (text-rotate, ping, glitch), `Avatar` (aura, hover-3d), `BeyondCode` and `UpcomingProjects` (hover-3d, ping), `Navbar` (glitch-hover), `DrawerMenu` (hover-neon), `ThemeToggle` (swap-rotate), `BackToTop`. Other components change through tokens and shared classes only.
- `CLAUDE.md` (Styling, Style files, Content sections), `README` if it describes the look, and `docs/DEPLOYMENT.md` only if affected (not expected).
- No API, data, profile schema or deployment changes; one new dependency (`framer-motion`) plus the font link. Verified with `npm run typecheck`, `npm run lint`, `npm run build` and a manual browser check of both themes at 320px, tablet and desktop widths.
