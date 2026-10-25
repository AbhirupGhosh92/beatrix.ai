# beatrix.ai

Single-page bio/resume site built with React, TypeScript, Vite, Tailwind CSS v4 and daisyUI.

## Setup

```bash
npm install
npm run dev
```

Content lives in `src/data/profile.json`, which is git-ignored. Copy `src/data/profile.example.json` to `src/data/profile.json` and fill in your own details; without it the site renders the placeholder example. Put your resume in `public/` and photo at `public/avatar.jpg` (both git-ignored).

Other scripts: `npm run check` (typecheck + lint), `npm run build`, `npm run preview`.
