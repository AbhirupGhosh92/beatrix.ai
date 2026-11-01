# Design

## Context

Observed in the running app (see proposal.md - Why):

- `ReleaseNotes` is rendered last in `src/app/layout.tsx`, inside a wrapper with `bg-neutral text-neutral-content`. The `<dialog>` is a child of that wrapper, so `.modal-box` (white background in the light theme) inherits the pale `neutral-content` colour. In the dark theme `neutral-content` equals `base-content`, which is why only the light theme fails.
- The global unlayered `button { @apply btn }` rule beats daisyUI's layered modifiers. Effects: `btn-xs`/`btn-ghost` on the version button are ignored (40px tall instead of extra small); `absolute` on the close button is ignored (it stays `position: relative`, 54x40, and pushes the title down); the backdrop `<button>close</button>` shows as a bar. `buttons.css` already re-applies `fixed`/`absolute` only for `.button-*` classes.
- `BackToTop` is `position: fixed`, bottom 1rem (2rem from `sm`), centred, and shows within 120px of the page bottom, where the version row (`pb-6`, last element) sits. The footer avoids it with `pb-24`.

## Goals / Non-Goals

**Goals:**
- Fix the three defects with the smallest change, without touching the back-to-top behaviour.

**Non-Goals:**
- No new global button styles; no layering of the global `button` rule (CLAUDE.md warns against it).

## Decisions

1. **Clearance for the version row**: give the wrapper bottom padding that clears the floating button (same approach and magnitude as the footer's `pb-24`). Alternatives: move the version into the footer (breaks the spec's "very last element"); move or hide the back-to-top button near the version (changes an unrelated feature).
2. **Readable text**: set `text-base-content` on the modal box rather than relying on inheritance. Alternative: render the dialog outside the `bg-neutral` wrapper (cleaner, but a portal or markup split for little gain). The wrapper's own `text-neutral-content` stays for the version button.
3. **Close control**: use the existing `.button-*` + `btn-square` + `absolute` pattern that `buttons.css` already supports, instead of adding a new override. The version button gets the same treatment if it needs to be small; otherwise a semantic class in `src/styles/components/` with the size set explicitly.
4. **Backdrop button**: hide its visible text (`sr-only` style text or empty content with `aria-label`) and keep it a `<button>` inside `form method="dialog"` so backdrop click-to-close still works.

## Risks / Trade-offs

- [Extra bottom padding makes the page slightly longer] → Same value the footer already uses; verify the version stays last.
- [Unlayered `button` rule can win again] → Check computed `position`, size and colour in both themes in the browser rather than trusting class names.
- [Button size is a judgement call] → Assumed: keep the small ghost look the markup declares; trivial to change if a larger button is preferred.
