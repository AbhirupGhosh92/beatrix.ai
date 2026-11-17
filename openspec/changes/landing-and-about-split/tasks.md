# Tasks

## 1. Routing and gate

- [x] 1.1 Add `/about` to `PUBLIC_PATHS` in `src/lib/access.ts`; confirm no other route becomes public
- [x] 1.2 Move the bio page composition from `src/app/page.tsx` to `src/app/about/page.tsx`
- [x] 1.3 Add a "Main site" link to `/` on the About page (label from the profile `nav`, with example fallback)

## 2. Home config

- [x] 2.1 Add `src/data/homeConfig.ts` (type), `src/data/home-config.example.json` (placeholder keys) and a sanitizer in `src/lib/`
- [x] 2.2 Add the `homeConfig` Cloud Function (`functions/src/`), export it in `functions/src/index.ts` and add it to `function_names` in `terraform/functions/functions.tf`
- [x] 2.3 Add `src/middleware/homeConfigService.ts` (cache, example fallback) and expose the config to components (`useHomeConfig()`)
- [x] 2.4 List `home-config.json` in `/admin/cms` (always listed, example opened as unsaved until first save) in `functions/src/cms.ts`

## 3. Landing page

- [x] 3.1 Build the landing page at `src/app/page.tsx`: configured content and Google sign-in for anonymous visitors
- [x] 3.2 Add the signed-in state: message, button to open the drawer (when it has content) and a button to `/about`
- [x] 3.3 Keep the navbar hamburger and drawer hidden for anonymous visitors on `/` and `/about`
- [x] 3.4 Confirm release notes show on `/` only (not on `/about`)

## 4. Drawer item

- [x] 4.1 Add the "About me" item (`href: /about`) to `profile.example.json` and support its icon in the profile type and normalizer
- [x] 4.2 Note in the PR that the stored profile needs the item added once (stored `drawerItems` replaces the example's)

## 5. Verification

- [x] 5.1 `npm run typecheck`, `npm run lint`, `npm run build`, `npm run functions:build`, `scripts/check-functions.sh`, `openspec validate --all`
- [ ] 5.2 Manual browser check, both themes: anonymous `/` (sign-in only, no menu, no About link), `/about` by URL (public, link back, no version button), signed-in `/` (signed-in state, drawer with About me), a protected path still redirects to `/`

## 6. Docs

- [x] 6.1 Update `CLAUDE.md` (page composition, public paths, home config), `docs/DEPLOYMENT.md` (new function) and the README if affected
