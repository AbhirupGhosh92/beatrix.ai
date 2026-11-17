## 1. Config data layer (owner: builder-1)

File set: `src/data/homeConfig.ts`, `src/data/home-config.example.json`, `src/lib/homeConfigSanitize.ts`

- [x] 1.1 Extend `HomeConfig` per design decision 1 (`eyebrow`, `previewLabel`, `features`, `howItWorks`, `closing`); export `HOME_ICONS`, `HomeIcon`, `FeatureItem`, `StepItem` and the limit constants. Verify: `npm run typecheck`.
- [x] 1.2 Write the example copy (real capabilities only; steps Build, Tailor, Track; AI tailor and skill match `preview: true`; no bio, numbers, pricing or testimonials; 6 to 8 features). Verify: throwaway script shows `sanitizeHomeConfig(example, example)` returns it with no warnings.
- [x] 1.3 Extend `sanitizeHomeConfig` with the all-or-nothing list rules of design decision 3, keeping the existing string and `aboutHref` checks. Verify with a throwaway script (not committed): a valid list is kept; a non-array, unknown icon, 13 items, duplicate id and over-long text each fall back to the example and warn once; missing keys fall back; `npm run check`.

## 2. Product page UI (owner: builder-2, starts after group 1 is merged)

File set: `src/components/sections/LandingHero.tsx`, `src/components/sections/LandingFeatures.tsx`, `src/components/sections/LandingSteps.tsx`, `src/components/sections/LandingClosing.tsx`, `src/components/ui/landingIcons.ts`, `src/styles/components/landing.css`, `src/index.css`, `src/app/page.tsx`

- [ ] 2.1 `landingIcons.ts`: map every `HomeIcon` to a lucide component (`Record<HomeIcon, ...>`). Verify: typecheck.
- [ ] 2.2 The four section components per design decision 5: motion through `ui/motion.tsx` only, semantic classes, heading order h1/h2/h3, `<ol>` for steps, preview badge from `previewLabel`. Verify: lint.
- [ ] 2.3 `landing.css` (`.feature-card`, `.preview-badge`) and its `@import` in `src/index.css`. Verify: build; both themes in the browser.
- [ ] 2.4 `page.tsx`: anonymous branch renders the four sections full width; the signed-in branch, drawer, navbar and release notes stay unchanged. Verify in the browser at `/` anonymous: all sections, no bio text, 320px without horizontal scroll, light and dark, reduced motion.
- [ ] 2.5 `npm run check` and `npm run build` pass.

## 3. Docs and wrap-up (owner: architect)

File set: `CLAUDE.md`, `openspec/changes/ai-platform-home/tasks.md`

- [ ] 3.1 Update the `CLAUDE.md` landing-page paragraph (new home config keys, closed icon vocabulary, list limits, section components, `landing.css`).
- [ ] 3.2 Final `npm run check`, `npm run build`, `openspec validate ai-platform-home --strict`; tell the PO the change is ready for testing (the PO runs `/opsx:archive`).
