## Context

Three small fixes after the landing/About split (issue #132). `BackToTop` is a fixed, bottom-center button (`bottom: 1rem`, `2rem` from `sm`) that appears within 120px of the page bottom; the bio page mounts it after `Footer`, whose `pb-24` keeps text clear of it. `ReleaseNotes` copied that `pb-24` for the version row, but on `/` the row is the last element, so the band below the button is large and the spacing is uneven.

## Decisions

1. **Version row: even padding, version button aligned to the start.** The row becomes `py-4` with the button in the same capped, gutter-padded container as the page (`mx-auto w-full max-w-screen-2xl px-3 sm:px-6 lg:px-8`, `justify-start`). The scroll-to-top button is centered, so a start-aligned version never overlaps it at any width (at 320px the version button is about 60px wide and ends well before the centered button starts).
   - Rejected: keep the version centered and pad the bottom to clear the button (that is the uneven band the owner reported).
   - Rejected: move or restyle `BackToTop` for `/` (out of scope; it is reused as is).
2. **Scroll-to-top on `/`: mount `<BackToTop />` in `src/app/page.tsx`**, inside `drawer-content` after `<main>` (as `about/page.tsx` does), for both the anonymous and the signed-in branch. It reads its label from `useProfile()`, already available in the layout.
3. **Main site link: remove it.** Drop the `mainSiteHref` prop and its link from `Navbar.tsx` (and the `House` import), the prop from `about/page.tsx`, and `nav.mainSiteLabel` from `profile.ts` and `profile.example.json`; nothing else uses them (checked with grep). A stored profile that still has the key is harmless: `getProfile()` only fills missing keys from the example.

## Risks

- The version row is not covered by the Playwright-less checks; the Tester verifies at 320, 768 and 1280px in both themes with the button visible at the bottom.
- No API, data, access or deployment change.
