# beatrix.ai

A single-page personal bio / resume site aimed at recruiters, built with a cyberpunk-meets-cute aesthetic: neon glows, glitch and jelly-wiggle hover effects, animated stats, draggable before/after achievement cards and a light/dark theme toggle.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
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
- [Deployment](#deployment-firebase-app-hosting)
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

React 19 · TypeScript 6 · Next.js 16 · Tailwind CSS v4 (CSS-first config) · daisyUI v5 · lucide-react icons · ESLint 10 flat config.

## Getting started

Requires Node.js 20+ and npm (or pnpm).

```bash
git clone https://github.com/AbhirupGhosh92/beatrix.ai.git
cd beatrix.ai
npm install
npm run dev
```

Open http://localhost:3000.

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
| `npm run dev` | `next dev` |
| `npm run prebuild` | `node scripts/write-profile.mjs` |
| `npm run build` | `next build` |
| `npm run lint` | `eslint .` |
| `npm run start` | `next start` |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run lint:fix` | `eslint . --fix` |
| `npm run check` | `npm run typecheck && npm run lint` |
| `npm run clean` | `rm -rf .next out next-env.d.ts *.tsbuildinfo` |
<!-- scripts:end -->

## Project structure

<!-- structure:start -->
```text
src/
├── index.css
├── ThemeToggle.tsx
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── admin/
│   │   └── page.tsx
│   └── api/
│       └── admin/
│           └── cms/
│               └── route.ts
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
│   ├── FirebaseInit.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   ├── NavbarDropdown.tsx
│   ├── Reveal.tsx
│   ├── SectionHeading.tsx
│   ├── Skills.tsx
│   ├── Stats.tsx
│   ├── TiltCard.tsx
│   └── UpcomingProjects.tsx
├── data/
│   ├── profile.example.json
│   ├── profile.json
│   └── profile.ts
├── hooks/
│   └── useInView.ts
└── lib/
    └── firebase.ts
```
<!-- structure:end -->

## Theming

Themes are defined in `src/index.css` with `@plugin "daisyui/theme"`. `beatrix-light` is a pastel theme and `beatrix-dark` a neon cyberpunk one. Fonts (Rajdhani / Orbitron for dark, Quicksand / Fredoka for light) load from Google Fonts via link tags in `src/app/layout.tsx`. Use `text-brand`, `text-brand-2` and `text-brand-3` for coloured text, since the pastel palette is too pale to read otherwise.

## Deployment (Firebase App Hosting)

The site deploys from GitHub to [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) using `apphosting.yaml` (scaled 0-2 instances). Private values are Firebase secrets, declared by name only in `apphosting.yaml`:

```bash
firebase apphosting:secrets:set PROFILE_JSON_URL # gs://BUCKET/profile.json
firebase apphosting:secrets:set EXAMPLE_API_KEY  # server-only key used by src/app/api/example/route.ts
```

- `PROFILE_JSON_URL` is available at build time. `npm run build` runs `scripts/write-profile.mjs` first (`prebuild`), which downloads that URL, validates the JSON and writes `src/data/profile.json`; without it the build falls back to `profile.example.json`. Upload `profile.json` to a private GCS bucket and set the secret to its `gs://BUCKET/profile.json` path; the build reads it as its service account, so grant that account `roles/storage.objectViewer` on the bucket (`gcloud storage buckets add-iam-policy-binding gs://BUCKET --member=serviceAccount:BUILD_SA_EMAIL --role=roles/storage.objectViewer`). An `https://` URL (public or signed) also works. For a local run, set `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)`.
- `EXAMPLE_API_KEY` is runtime-only and must be read in server code (route handlers) without a `NEXT_PUBLIC_` prefix.
- Firebase Analytics and App Config (Remote Config) are initialized on the client side via `src/lib/firebase.ts` and `<FirebaseInit />` using standard public environment variables (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.).
- `public/*.docx` is git-ignored, so the resume is not deployed. Host it elsewhere (e.g. a Cloud Storage URL) and set `person.resumeFile` to that URL.
- Manual steps: use the Blaze plan, run `firebase login`, create the secrets above, and connect the GitHub repo to an App Hosting backend in the Firebase console.

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
