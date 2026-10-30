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
- [Infrastructure Automation (Terraform)](#infrastructure-automation-terraform)
- [Deployment](#deployment-firebase-app-hosting)
- [Spec-driven development](#spec-driven-development-openspec)
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
| `npm run build` | `next build` |
| `npm run lint` | `eslint .` |
| `npm run start` | `next start` |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run lint:fix` | `eslint . --fix` |
| `npm run check` | `npm run typecheck && npm run lint` |
| `npm run clean` | `rm -rf .next out next-env.d.ts *.tsbuildinfo` |
| `npm run functions:build` | `pnpm --prefix functions run build` |
| `npm run deploy:functions` | `firebase deploy --only functions,firestore:rules,storage` |
| `npm run infra:preflight` | `bash scripts/env-preflight.sh` |
| `npm run functions:serve` | `pnpm --prefix functions run build && firebase emulators:start --only functions,firestore,storage,auth` |
| `npm run infra:recreate` | `bash scripts/recreate-environment.sh` |
| `npm run infra:seed` | `bash scripts/seed-data.sh` |
| `npm run infra:check` | `bash scripts/check-infra.sh` |
<!-- scripts:end -->

## Project structure

<!-- structure:start -->
```text
src/
├── index.css
├── proxy.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── access/
│   │   │   └── page.tsx
│   │   └── cms/
│   │       └── page.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   ├── cms/
│   │   │   │   └── route.ts
│   │   │   ├── resumes/
│   │   │   │   └── route.ts
│   │   │   └── users/
│   │   │       └── route.ts
│   │   ├── auth/
│   │   │   ├── me/
│   │   │   │   └── route.ts
│   │   │   └── session/
│   │   │       └── route.ts
│   │   └── resumes/
│   │       ├── route.ts
│   │       ├── [id]/
│   │       │   └── route.ts
│   │       └── config/
│   │           └── route.ts
│   └── resume-builder/
│       ├── layout.tsx
│       └── page.tsx
├── components/
│   ├── admin/
│   │   └── OrphanedResumes.tsx
│   ├── layout/
│   │   ├── AdminNav.tsx
│   │   ├── BackToTop.tsx
│   │   ├── DrawerMenu.tsx
│   │   ├── FirebaseInit.tsx
│   │   ├── Footer.tsx
│   │   ├── Navbar.tsx
│   │   ├── NavbarDropdown.tsx
│   │   ├── ProfileProvider.tsx
│   │   ├── ResumeNav.tsx
│   │   └── ThemeToggle.tsx
│   ├── resume/
│   │   ├── ExportPanel.tsx
│   │   ├── FieldInput.tsx
│   │   ├── ResumeBuilder.tsx
│   │   ├── ResumeEditor.tsx
│   │   ├── ResumeList.tsx
│   │   ├── StructureEditor.tsx
│   │   ├── StructureForm.tsx
│   │   └── TemplatePreview.tsx
│   ├── sections/
│   │   ├── About.tsx
│   │   ├── BeyondCode.tsx
│   │   ├── Education.tsx
│   │   ├── Experience.tsx
│   │   ├── Hero.tsx
│   │   ├── Skills.tsx
│   │   ├── Stats.tsx
│   │   └── UpcomingProjects.tsx
│   └── ui/
│       ├── AchievementCard.tsx
│       ├── Avatar.tsx
│       ├── CopyEmailButton.tsx
│       ├── JsonEditor.tsx
│       ├── Reveal.tsx
│       └── SectionHeading.tsx
├── data/
│   ├── profile.example.json
│   ├── profile.ts
│   ├── resume-config.example.json
│   └── resumeConfig.ts
├── hooks/
│   └── useInView.ts
├── lib/
│   ├── access.ts
│   ├── drawer.ts
│   ├── firebase.ts
│   ├── jsonDefaults.ts
│   ├── resumeClient.ts
│   ├── resumeConfigSanitize.ts
│   ├── resumeForm.ts
│   ├── resumeTypes.ts
│   ├── resumeValidation.ts
│   └── resume/
│       ├── export.ts
│       ├── markdown.ts
│       ├── model.ts
│       ├── sample.ts
│       ├── style.ts
│       ├── toDocx.ts
│       └── toPdf.ts
├── middleware/
│   ├── adminService.ts
│   ├── cloudFunctions.ts
│   ├── profileService.ts
│   ├── resumeAdminService.ts
│   ├── resumeConfigService.ts
│   ├── resumeService.ts
│   ├── routeHelpers.ts
│   ├── sessionService.ts
│   └── userService.ts
└── styles/
    ├── base/
    │   └── elements.css
    ├── components/
    │   ├── back-to-top.css
    │   ├── buttons.css
    │   ├── google-signin.css
    │   ├── navigation.css
    │   ├── skills-tabs.css
    │   ├── surfaces.css
    │   ├── text-colors.css
    │   └── typography.css
    ├── effects/
    │   ├── glitch.css
    │   ├── hover.css
    │   ├── reduced-motion.css
    │   └── reveal.css
    ├── tokens/
    │   ├── code.css
    │   ├── fonts.css
    │   ├── themes.css
    │   └── variants.css
    └── vendor/
        ├── json-view.css
        └── monaco.ts
```
<!-- structure:end -->

## Theming

Themes are defined in `src/styles/tokens/themes.css` with `@plugin "daisyui/theme"`; `src/index.css` imports all style files from `src/styles/` in order. `beatrix-light` is a pastel theme and `beatrix-dark` a neon cyberpunk one. Fonts (Rajdhani / Orbitron for dark, Quicksand / Fredoka for light) load from Google Fonts via link tags in `src/app/layout.tsx`. Use `text-brand`, `text-brand-2` and `text-brand-3` for coloured text, since the pastel palette is too pale to read otherwise.

## Infrastructure Automation (Terraform)

Infrastructure for lower environments (`dev`, `staging`, etc.) is fully automated using Terraform in the `terraform/` directory:

```bash
# Recreate infrastructure for dev environment:
npm run infra:recreate dev beatrix-ai-dev
```

This automates GCP API enablement, Firebase Web App provisioning, Cloud Firestore database creation, Cloud Storage bucket configuration, security rules release, and initial data seeding. See [`terraform/README.md`](terraform/README.md) for full details.

## Deployment (Firebase App Hosting)

The site deploys from GitHub to [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) using `apphosting.yaml` (scaled 0-1 instances). The backend is a set of [Cloud Functions for Firebase](https://firebase.google.com/docs/functions) in `functions/`, deployed separately:

```bash
npm run deploy:functions   # firebase deploy --only functions,firestore:rules,storage
```

`.github/workflows/deploy-functions.yml` does the same on every push to `main` that touches `functions/` or the rules (add the repository secret `FIREBASE_SERVICE_ACCOUNT` with a service-account JSON key and the variable `FIREBASE_PROJECT_ID`).

- Architecture: the browser only talks to the Next.js server (`src/app/api/*`, backed by the services in `src/middleware/`). Only that server calls the Cloud Functions, so function URLs, tokens, paths and payloads never reach a client.
- Every API is its own private HTTP function: `getProfile`, `adminListFiles`, `adminGetFile`, `adminSaveFile`, `adminListUsers`, `adminSetUser`, `sessionCreate`, `sessionVerify` and `status`. `/admin` has a **CMS** section (`/admin/cms`) and an **Access** section (`/admin/access`) where admins add users, change roles and revoke or restore access; a new Google account is registered as a `reader` on its first sign-in. Cloud Run IAM lets only the App Hosting service account (`firebase-app-hosting-compute@PROJECT_ID.iam.gserviceaccount.com`) invoke them, and every call carries a Google-signed ID token.
- `profile.json` is stored in Firebase Storage (`cms/profile.json` in the default bucket). Seed it once with `gcloud storage cp src/data/profile.json gs://PROJECT_ID.firebasestorage.app/cms/profile.json`; after that, edit it in the admin panel (`/admin`). Edits go live within about 30 seconds, no rebuild. Previous versions are kept in `cms-backups/`.
- Every route except `/` requires a server-verified session (an httpOnly cookie set at sign-in and checked by `src/proxy.ts`). Roles come from `allowed_emails/{email}.role` (`reader` by default, then `user-base`, `user-advanced`, `admin`; a legacy `admin: true` entry is an admin). Only the `admin` role can use `/admin` and the admin APIs; the functions verify the forwarded Firebase ID token themselves. `storage.rules` and `firestore.rules` deny direct client access to everything else.
- The server needs the Firebase project id (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, or App Hosting's `GOOGLE_CLOUD_PROJECT`). For local development set `FUNCTIONS_CALLER_SERVICE_ACCOUNT=firebase-app-hosting-compute@PROJECT_ID.iam.gserviceaccount.com` in `.env.local` (your gcloud user needs the Service Account Token Creator role on it); without reachable functions the site falls back to `src/data/profile.json`, then `profile.example.json`.
- Firebase Analytics and App Config (Remote Config) are initialized on the client side via `src/lib/firebase.ts` and `<FirebaseInit />` using standard public environment variables (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.).
- `public/*.docx` is git-ignored, so the resume is not deployed. Host it elsewhere (e.g. a Cloud Storage URL) and set `person.resumeFile` to that URL.
- Manual steps: use the Blaze plan, run `firebase login`, create the secrets above, and connect the GitHub repo to an App Hosting backend in the Firebase console.

## Spec-driven development (OpenSpec)

From version 1.2.0 changes are specified before they are built with [OpenSpec](https://github.com/Fission-AI/OpenSpec). Current behavior lives in `openspec/specs/<capability>/spec.md`; each non-trivial change is a folder in `openspec/changes/<name>/` (proposal, design, tasks, spec deltas). Install the CLI once, then use the slash commands in Claude Code:

```bash
npm install -g @fission-ai/openspec@latest   # or: brew install openspec
openspec validate --all                      # check specs and in-flight changes
```

`/opsx:propose <name>` creates a change, `/opsx:apply` implements its tasks and `/opsx:archive` merges its spec deltas into `openspec/specs/` before the PR is ready. Create the GitHub issue and branch first. When a spec is required and how it maps to issues and PRs: [`.claude/rules/openspec.md`](.claude/rules/openspec.md).

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
