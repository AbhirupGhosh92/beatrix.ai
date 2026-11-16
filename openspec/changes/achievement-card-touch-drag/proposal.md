# Proposal

## Why

On phones (iOS Safari, touch Firefox) the before/after achievement cards cannot be dragged. The cards use daisyUI's `diff`, whose handle relies on CSS `resize: horizontal`, which touch browsers do not support. daisyUI's touch fallback snaps the card to about 95% green on tap and offers no way back, so the pain points can never be reached on a phone and the card cannot be scrolled left and right smoothly as it can on desktop.

## What Changes

- Replace the CSS-resize handle with a pointer-driven grip that works with mouse, touch and pen.
- Only the grip drags; the rest of the card does not capture touches, so vertical page scrolling is never blocked.
- Add keyboard support (arrow keys, Home, End) on the grip.
- The card starts with the handle at 50/50 and a tap on the card body no longer moves it.
- The pain point and solution lists are derived from the handle position instead of a `ResizeObserver`.
- Keep the visual result (red before side, green after side, dominant-side lists, reduced-motion behavior).

Fixes #TBD (issue to be created before the branch, per `.claude/rules/github-workflow.md`).

Out of scope: card content or copy, the Experience section layout, other draggable or hover components, changes to `profile.json` shape.

## Capabilities

### New Capabilities
- `achievement-cards`: behavior of the draggable before/after achievement cards (handle interaction on mouse and touch, initial position, which list is shown).

### Modified Capabilities

## Impact

- `src/components/ui/AchievementCard.tsx` (markup and logic); possibly a small style rule in `src/styles/components/` for the grip and `touch-action`.
- No API, data, profile schema, dependency or deployment changes.
- `design-language` mentions "the draggable before/after achievement cards" only as retained behavior; it is unchanged.
