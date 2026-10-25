---
paths:
  - "src/**/*.{ts,tsx}"
---

# TypeScript rules

These follow from `tsconfig.app.json`; violating them fails `npm run build`.

- Use `import type { ... }` for type-only imports (`verbatimModuleSyntax`).
- No `enum`, `namespace`, or constructor parameter properties (`erasableSyntaxOnly`). Use union types or `as const` objects.
- Remove unused imports, locals, and parameters (`noUnusedLocals`, `noUnusedParameters`).
- Import local modules with their explicit extension, e.g. `./App.tsx`, matching existing code.
