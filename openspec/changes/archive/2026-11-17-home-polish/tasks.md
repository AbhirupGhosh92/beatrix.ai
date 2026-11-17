## 1. Code (owner: builder-1; files: src/app/page.tsx, src/app/about/page.tsx, src/components/layout/ReleaseNotes.tsx, src/components/layout/Navbar.tsx, src/data/profile.ts, src/data/profile.example.json)

- [x] 1.1 `ReleaseNotes.tsx`: replace `pb-24` row with even `py-4`, start-aligned inside the capped gutter container; update the comment. Verify: `npm run check`; at 320/768/1280px the space above and below the button is equal and the centered scroll-to-top button does not cover it.
- [x] 1.2 `page.tsx`: mount `<BackToTop />` after `<main>` for both anonymous and signed-in states. Verify: appears only near the bottom of `/`, scrolls to top.
- [x] 1.3 Remove `mainSiteHref` and the link (and `House` import) from `Navbar.tsx`, the prop from `about/page.tsx`, and `nav.mainSiteLabel` from `profile.ts` and `profile.example.json`. Verify: `grep -rn mainSite src` is empty; `/about` navbar has no link to `/`; `npm run check` and `npm run build` pass.

## 2. Docs (owner: architect; files: CLAUDE.md)

- [x] 2.1 `CLAUDE.md`: remove the "Main site" link / `nav.mainSiteLabel` mention from the landing/About paragraph, and note that `/` mounts `BackToTop` and the version row is evenly padded and start-aligned.
