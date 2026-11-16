# Tasks

## 1. Interaction

- [ ] 1.1 Replace `.diff-resizer` and the `ResizeObserver` in `AchievementCard.tsx` with a `position` state (starts at 50) and a pointer-captured grip; verify with `npm run typecheck` and that a mouse drag moves the red layer and stops at the edges.
- [ ] 1.2 Remove `tabIndex` from the figure and make the grip a focusable `role="slider"` with arrow, Home and End keys; verify keyboard operation in the browser and `npm run lint`.
- [ ] 1.3 Derive pain, solution or hint from `position` with the existing 5% margin; verify each of the three states by dragging.

## 2. Styling

- [ ] 2.1 Add the grip and `touch-action: pan-y` styles in `src/styles/components/` (imported in `src/index.css`) with theme tokens, a 44px touch target and no animation under `prefers-reduced-motion`; verify in both themes at 320px, tablet and desktop widths.

## 3. Verification

- [ ] 3.1 Check on a touch device or Playwright mobile emulation: tapping the card body does not move it, dragging the grip is smooth, vertical swipes scroll the page; record the result.
- [ ] 3.2 Run `npm run check` and `npm run build`; run `openspec validate --all`.
- [ ] 3.3 Update docs: CLAUDE.md (the Experience paragraph that describes `AchievementCard` and the `.diff-resizer` ResizeObserver), the README if its generated sections change, and confirm `docs/DEPLOYMENT.md` needs no change.
