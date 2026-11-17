## Why

`/` is a placeholder: a title, one tagline and a sign-in button. It does not say what the app does, so a visitor has no reason to sign in. The app already has a real set of career tools (resume builder, resume score, AI tailoring and skill match, job tracker), and the market for AI job-search platforms (Teal, Huntr, Rezi, Jobscan) sells one story: one workspace that builds and tailors the resume, scores it against a job and tracks every application. The home page should present Asterion AI as that kind of AI platform, honestly, from what exists today.

Fixes #128.

## What Changes

- The landing page for anonymous visitors becomes a product page: hero with a value proposition and the Google sign-in, a "what it does" feature grid, a short how-it-works flow, an honest "early preview" label on the AI-backed features, and a closing sign-in call to action.
- Feature cards describe only capabilities that exist: resume builder (structured form, validation, live preview, templates, PDF/DOCX/Markdown export), resume score, AI tailor for a job and skill match (labelled early preview while the AI service returns placeholder results), job application tracker (search, sort, labels, status, tailored resume per application), private per-user storage, role-based access.
- No bio content (name, experience, resume facts, stats) appears on `/`; it stays on `/about`.
- The home config gains the keys for these sections; every text, label and link stays editable in `/admin/cms`, with the example as fallback.
- The signed-in state, Google sign-in behavior, release notes and `/about` are unchanged.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `landing-page`: the anonymous landing content becomes the AI platform product page and its config grows to match.

## Impact

- Code: `src/app/page.tsx`, `src/data/homeConfig.ts`, `src/data/home-config.example.json`, `src/lib/homeConfigSanitize.ts`, new section components in `src/components/sections/`, styles in `src/styles/`.
- Docs: `CLAUDE.md` landing paragraph, `openspec/specs/landing-page/spec.md` (via archive).
- No new routes, APIs, dependencies, infrastructure, cost or stored-data changes.

## Out of scope

Bio content, new product features, pricing or plans, testimonials, user counts or other invented numbers, a roadmap or "coming soon" features (nothing unbuilt is advertised), real AI model integration, changes to sign-in, access control or `/about`.

## Market research summary (positioning input, not page content)

- Teal: all-in-one (builder, tracker, extension, keyword match); criticised as unclear about what it primarily is.
- Huntr: tracker-first, Kanban, strong visual organisation; weaker resume tools.
- Rezi and Jobscan: ATS-style scoring and keyword match as the headline.
- Common pattern: a one-line promise, a feature grid, a "build, tailor, track" flow, a sign-up call to action. Positioning chosen here: one connected loop (build, tailor, track) powered by AI, private to the user.
- Caveat: sources are mostly vendor or affiliate content; used for positioning only, no claim on the page depends on them.
