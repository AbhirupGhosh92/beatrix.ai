## Context

See `proposal.md` (Why, What Changes) and `specs/landing-page/spec.md`. Today `src/app/page.tsx` renders a title, tagline and `GoogleSignIn` for anonymous visitors from a flat all-strings `HomeConfig`; `sanitizeHomeConfig` (`src/lib/homeConfigSanitize.ts`) accepts only string keys and an `aboutHref` path; `homeConfigService.ts` merges the stored file over `home-config.example.json` with `withDefaults` (a stored array replaces the example's array) and then sanitizes. The signed-in state, drawer, navbar and `ReleaseNotes` live in the same page/layout and must not change.

## Goals / Non-Goals

**Goals:** an anonymous product page (hero, feature grid, how-it-works, closing sign-in CTA) whose every text, label, feature and step is editable in `/admin/cms` with the example as per-key fallback; a page that always renders even with a bad stored value; both themes, 320-1920px, reduced motion.

**Non-Goals:** new routes, APIs, dependencies, Cloud Functions, cost or stored-data changes (none needed: the home config file already exists and is already served through `getConfig`); bio content; unbuilt features, pricing, testimonials, numbers; changes to sign-in, access control, `/about`, signed-in state.

## Decisions

1. **Config shape: keep the flat string keys, add structured keys.** `HomeConfig` keeps every existing key (`title`, `tagline`, sign-in labels, errors, signed-in keys, `aboutLabel`, `aboutHref`) and gains:
   - `eyebrow` (string, small label above the headline) and `previewLabel` (string, the early-preview badge text);
   - `features: { heading, intro, items: FeatureItem[] }` with `FeatureItem = { id, title, description, icon, preview }` (`preview: true` shows `previewLabel`);
   - `howItWorks: { heading, intro, steps: StepItem[] }` with `StepItem = { title, description, icon }`;
   - `closing: { title, message }` (the closing CTA reuses `GoogleSignIn` and the existing sign-in labels).
   Rejected: a separate config file (needs a new config constant, loader and CMS entry; no benefit) and putting the lists in `profile.json` (the landing config is deliberately apart from the bio profile).
2. **Closed icon vocabulary.** `HOME_ICONS` (a `const` array of kebab names: `file-text`, `sparkles`, `target`, `kanban`, `shield`, `lock`, `layout-template`, `download`, `gauge`, `users`) and type `HomeIcon` live in `src/data/homeConfig.ts` (values only, no React); `src/components/ui/landingIcons.ts` maps them to lucide components with `Record<HomeIcon, ...>` so a missing mapping fails typecheck (same idea as `DrawerMenu` `ICONS`). If a name does not exist in the installed `lucide-react`, the Builder swaps the closest icon and keeps list and map in step.
3. **Sanitizing lists: all-or-nothing per list.** `sanitizeHomeConfig` keeps its string and `aboutHref` checks and also validates `features` and `howItWorks`: items must be a non-empty array of objects with non-blank string fields, `icon` in `HOME_ICONS`, `preview` a boolean when present, unique feature `id`s. Limits (exported constants): features 1-12, steps 1-6, title <= 80 chars, description <= 280, heading/intro <= 160. Any violation replaces that list's items with the example's and warns once; valid `heading`/`intro` are kept independently. Rejected: dropping only the bad item (silently hides content an admin intended; the all-or-nothing rule matches how `sanitizeResumeConfig` treats limits and satisfies the spec scenario "Invalid list").
4. **`withDefaults` interplay.** Nested objects merge per key and arrays are replaced wholesale, so a stored `features.items` replaces the example's while a missing `features.heading` falls back. No change to `homeConfigService.ts` or `jsonDefaults.ts`.
5. **Components** in `src/components/sections/`, all reading `useHomeConfig()`: `LandingHero.tsx` (eyebrow, the single `h1`, tagline, `GoogleSignIn`), `LandingFeatures.tsx` (`h2`, card grid with `Stagger`/`StaggerItem`, preview badge), `LandingSteps.tsx` (`h2`, numbered `<ol>`, `Reveal`), `LandingClosing.tsx` (`h2`, message, `GoogleSignIn`). The `Landing` prefix avoids confusion with the bio `Hero.tsx`. `page.tsx` keeps the drawer shell and the signed-in branch (centered `main`) exactly as is; the anonymous branch renders the four sections in a full-width `main`, so both sign-in CTAs disappear when signed in. Heading order: `h1`, `h2` per section, `h3` for card and step titles.
6. **Styling.** Reuse `surface`, `text-muted`, `text-brand`, `heading-display`, `button-*`, `hover-subtle`. New `src/styles/components/landing.css` (imported in `src/index.css` after `surfaces.css`) adds only `.feature-card` (surface, padding, hover tint from theme tokens) and `.preview-badge` (small neutral/tonal pill from theme tokens, not a status color). Layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, gaps) stays inline. No raw colors, no new dependency.
7. **Motion and a11y.** Motion only through `ui/motion.tsx`, which already renders statically under `useReducedMotion()`. Icons are `aria-hidden`; the preview badge is text, not color-only.
8. **Copy.** The example ships the copy and describes only: resume builder (structured form, live preview, templates, PDF/DOCX/Markdown export), resume score, AI tailor and skill match (`preview: true`), job tracker (search, sort, labels, status, tailored resume per application), private per-user storage, role-based access; steps Build, Tailor, Track. No bio, stats, numbers, pricing, testimonials or "coming soon". The PO reviews wording in the PR.
9. **Docs.** `CLAUDE.md` landing paragraph is updated; the spec merges through archive.

## Risks / Trade-offs

- A stored `home-config.json` from before this change lacks the new keys: `withDefaults` supplies them.
- A stored `features.items` replaces the example's list wholesale, so later example additions do not reach a customized store; accepted, same as `nav.drawerItems`.
- Lucide icon names may differ in the pinned version: caught by typecheck/build.
- No test runner exists: the pure sanitizer is checked with a throwaway script (not committed) plus the Tester's browser scenarios.
