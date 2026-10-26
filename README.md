# beatrix.ai

A single-page personal bio / resume site aimed at recruiters, built with a cyberpunk-meets-cute aesthetic: neon glows, glitch and jelly-wiggle hover effects, animated stats, draggable before/after achievement cards and a light/dark theme toggle.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![daisyUI](https://img.shields.io/badge/daisyUI-5-ff9903)

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Customising the content](#customising-the-content)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Theming](#theming)
- [Git hooks](#git-hooks)
- [Contributing and branch protection](#contributing-and-branch-protection)

## Features

- **Hero** with rotating text, an aura-framed 3D-hover avatar (initials fallback), CTA buttons and a copy-email toast.
- **Stats** with JS count-up counters.
- **About** told as a chat between the owner and a recruiter.
- **Experience** as draggable before/after `diff` cards listing pain points and solutions, followed by a timeline of roles.
- **Skills** in tabs with a sliding highlight pill, plus **Education** and **Beyond code** sections.
- **Light / dark themes** (`beatrix-light`, `beatrix-dark`) driven by daisyUI's theme controller with no flash on first paint; the choice persists in `localStorage` and defaults to the OS preference.
- **Responsive** from 320px to 1920px, with a sticky navbar and a back-to-top button.
- Honours `prefers-reduced-motion`.
- **All copy lives in one JSON file**, so the page can be re-skinned for anyone without touching components.

## Tech stack

React 19 · TypeScript 6 · Vite 8 · Tailwind CSS v4 (CSS-first config) · daisyUI v5 · lucide-react icons · ESLint 10 flat config.

## Getting started

Requires Node.js 20+ and npm (or pnpm).

```bash
git clone https://github.com/AbhirupGhosh92/beatrix.ai.git
cd beatrix.ai
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Customising the content

Personal data is deliberately **not** committed.

1. Copy `src/data/profile.example.json` to `src/data/profile.json` (git-ignored).
2. Fill in your details. If `profile.json` is absent the site renders the placeholder example.
3. Optionally add `public/avatar.jpg` and your resume (e.g. `public/resume.docx`, matching `person.resumeFile`). Both are git-ignored.

The shape of the file is defined by the `Profile` interface in `src/data/profile.ts`; update both together when adding fields. Use only real facts and metrics.

## Scripts

<!-- scripts:start -->
| Command | Runs |
| --- | --- |
| `npm run dev` | `vite` |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | `eslint .` |
| `npm run preview` | `vite preview` |
| `npm run typecheck` | `tsc -b` |
| `npm run lint:fix` | `eslint . --fix` |
| `npm run check` | `npm run typecheck && npm run lint` |
| `npm run clean` | `rm -rf dist node_modules/.vite *.tsbuildinfo node_modules/.tmp` |
| `npm run start` | `npm run build && vite preview` |
<!-- scripts:end -->

## Project structure

<!-- structure:start -->
```text
src/
├── App.tsx
├── index.css
├── main.tsx
├── ThemeToggle.tsx
├── components/
│   ├── About.tsx
│   ├── AchievementCard.tsx
│   ├── Avatar.tsx
│   ├── BackToTop.tsx
│   ├── BeyondCode.tsx
│   ├── CopyEmailButton.tsx
│   ├── DrawerMenu.tsx
│   ├── Education.tsx
│   ├── Experience.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   ├── NavbarDropdown.tsx
│   ├── Reveal.tsx
│   ├── SectionHeading.tsx
│   ├── Skills.tsx
│   └── Stats.tsx
├── data/
│   ├── profile.example.json
│   ├── profile.json
│   └── profile.ts
└── hooks/
    └── useInView.ts
```
<!-- structure:end -->

## Theming

Themes are defined in `src/index.css` with `@plugin "daisyui/theme"`. `beatrix-light` is a pastel theme and `beatrix-dark` a neon cyberpunk one. Fonts (Rajdhani / Orbitron for dark, Quicksand / Fredoka for light) load from Google Fonts in `index.html`. Use `text-brand`, `text-brand-2` and `text-brand-3` for coloured text, since the pastel palette is too pale to read otherwise.

## Git hooks

A versioned `pre-push` hook in `.githooks/` regenerates the **Scripts** and **Project structure** sections above (via `scripts/update-readme.mjs`). If the README was stale, the push is aborted so you can commit the refreshed file and push again. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

Run it manually any time with `node scripts/update-readme.mjs`. Everything outside the marked comment blocks is hand-written.

## Contributing and branch protection

`main` is protected: direct pushes are blocked, and changes land through pull requests.

```bash
git switch -c my-change
# ...edit, commit...
git push -u origin my-change
gh pr create
```

Run `npm run check` and `npm run build` before opening a PR.

### Automated review

`.github/workflows/claude-review.yml` runs [Claude Code Action](https://github.com/anthropics/claude-code-action) on every non-draft PR from this repo and posts inline review comments plus a summary. It needs a repository secret named `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions). Fork PRs are skipped because GitHub withholds secrets from them.
