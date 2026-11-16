# Design

## Context

`AchievementCard.tsx` renders daisyUI's `diff` (`diff-item-1` red, `diff-item-2` green, `diff-resizer`). The resizer is a CSS-`resize: horizontal` element observed with a `ResizeObserver`. On WebKit-touch and touch Firefox daisyUI instead snaps via `:focus` (`min/max-width: 5cqi`), and the card has `tabIndex={0}`, so a tap jumps it to ~95% green with no way back. Reproduced by reading the code and daisyUI 5.7.50's `diff.css`; not yet reproduced on a device.

## Goals / Non-Goals

**Goals:**
- One interaction model on mouse, touch and pen, with the divider position held in React state.
- Keep the existing look (the same classes, colors, aspect ratio, hint and list markup).

**Non-Goals:**
- Replacing daisyUI elsewhere, or moving the position into Redux (it is local UI state, per CLAUDE.md).

## Decisions

- **Own pointer handler instead of CSS resize.** A grip button with `onPointerDown` + `setPointerCapture`, `onPointerMove` and `onPointerUp` sets a `position` state (0..100, clamped) from `clientX` relative to the card's bounding rect. Alternatives: keep daisyUI and add `tabIndex` on `diff-item-1` (only two snap positions, rejected); a hidden `<input type="range">` (works everywhere but the thumb is hard to style and drag area is not the grip, rejected).
- **Drop daisyUI's `diff` entirely (as built).** Two absolutely positioned layers in a `container-type: inline-size` figure; the red layer's width is `--position` and its content keeps `100cqi` width so it does not squash. This avoids daisyUI's grid and its `:focus` snap altogether.
- **`touch-action: pan-y` on the grip only**, so horizontal drags go to the handler and vertical swipes still scroll; the card body keeps the browser default. Remove `tabIndex` from the figure.
- **Keyboard on the grip** with `role="slider"`, `aria-valuenow/min/max`, arrow steps of 5, Home/End.
- **Mode derived from state**, not an observer: pain when `position > 55`, solution when `< 45`, else hint, keeping the current 5% margin. Because the red side is the left side, `position` is the red share.
- **Transitions:** none while dragging; a short transition may apply to keyboard steps and is disabled under reduced motion.
- **Styles** for the grip go in `src/styles/components/` (new file imported in `src/index.css`, per the style-files rules) using theme tokens; `.button-*` global rules mean the grip must not be a `<button>` unless re-styled, so it is a `div` with `role="slider"` and `tabIndex={0}`.

## Risks / Trade-offs

- Pointer capture or `touch-action` behaving differently on iOS Safari → verify on a real iPhone and in Playwright's WebKit/mobile emulation where available.
- Layout differences from dropping daisyUI's resizer grid rows → compare both themes at 320px to 1920px.
- The grip is a small touch target → size it at least 44px tall.
