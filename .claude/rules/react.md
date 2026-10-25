---
paths:
  - "src/**/*.tsx"
---

# React rules

- React 19 with function components and hooks only.
- `eslint-plugin-react-refresh` (Vite preset) flags files that export both components and non-components. For a context, put the provider component in one file and the context object / `useX` hook in another, rather than exporting both from `ThemeContext.tsx`.
- `eslint-plugin-react-hooks` is enforced; follow the Rules of Hooks and exhaustive-deps warnings rather than disabling them.
- The app renders under `StrictMode` (`src/main.tsx`), so effects run twice in dev; make them idempotent with proper cleanup.
- Run `npm run lint` and `npm run build` after changes; there is no test suite.
