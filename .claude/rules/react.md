---
paths:
  - "src/**/*.tsx"
---

# React rules

- React 19 with function components and hooks only. Class components are forbidden: no `extends Component`/`PureComponent`, lifecycle methods, `this.setState` or `createReactClass`. For error boundaries use a library such as `react-error-boundary` (function-component API) rather than writing a class. Verify with: `grep -rE "extends (React\.)?(Pure)?Component|componentDidMount|componentWillUnmount|this\.setState|createReactClass" src`.
- Next App Router: add `'use client'` to any component using hooks, refs, observers, `localStorage`/`window` or event handlers, and never touch browser APIs during render (SSR); read them in effects.
- `eslint-plugin-react-hooks` is enforced; follow the Rules of Hooks and exhaustive-deps warnings rather than disabling them.
- The app runs with `reactStrictMode` (`next.config.ts`), so effects run twice in dev; make them idempotent with proper cleanup.
- Run `npm run lint` and `npm run build` after changes; there is no test suite.
