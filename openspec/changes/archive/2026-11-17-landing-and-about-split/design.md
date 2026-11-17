# Design

## Context

`/` is the only public page and renders the whole bio page; `layout.tsx` loads the profile per request and wraps everything in providers. The gate lives in `src/lib/access.ts` (`PUBLIC_PATHS`), `src/proxy.ts` redirects denied pages to `/`, the drawer exists only for signed-in users (`hasDrawerContent`), and `ReleaseNotes` renders only when `pathname === '/'`. The profile pipeline is: Storage `cms/profile.json` -> private `getProfile` function -> `profileService.ts` (30 s cache, example fallback via `withDefaults`). `resume-config.json` shows the second-config pattern (`resumeConfigService.ts`, `sanitizeResumeConfig`, always listed by `cms.ts`).

## Goals / Non-Goals

**Goals:**
- `/` is the landing page for all visitors; `/about` is the public bio page, shareable as a resume.
- A home config that mirrors the profile's storage, fallback and CMS editing.
- Gating otherwise unchanged.

**Non-Goals:**
- Redesigning bio sections, new roles or permissions, final landing copy.

## Decisions

1. **Move, don't copy, the page composition.** Today's `src/app/page.tsx` body moves to `src/app/about/page.tsx` (same sections, drawer shell, `UpcomingProjects` overlay). `src/app/page.tsx` becomes the landing page. Alternative (a shared `BioPage` component rendered by both) rejected: `/` must not show bio content.
2. **`/about` joins `PUBLIC_PATHS`.** No other route becomes public. Because it is a route, `requiredPermission('/about')` is null and the proxy passes it through; no session check happens, same as `/`.
3. **Drawer stays signed-in only.** The existing rule (no role -> no drawer, no menu button) already hides the sidebar for anonymous visitors, so nothing changes for them. "About me" is a normal drawer item (`id: about-me`, `href: /about`, `icon` a new supported value such as `user`) in `profile.example.json`; `visibleDrawerItems` keeps it because `requiredPermission('/about')` is null, which `?? 'site:view'` already allows for any signed-in role. The profile normalizer's icon list gains the new icon. Because the item is not a feature route it is not in `FEATURE_ROUTES`; switching it off hides the link but `/about` stays reachable by URL (this matches the request).
4. **Signed-in landing state (recommended option chosen).** The landing page reads the role with `useGetSessionRoleQuery`. Signed out: the configured Google sign-in button (reuse the existing sign-in component and `signIn` mutation). Signed in: a short "signed in" message, a button to open the drawer (`setDrawerOpen(true)`) when the drawer has content, and a button to `/about`. The landing page reuses the navbar shell so the hamburger appears for signed-in users only.
5. **One config API for every config file.** The three config readers (`getProfile`, `getResumeConfig` and the planned `getHomeConfig`) become one private function, `getConfig`, called with `{ file }`. File names are constants in `src/data/configFiles.ts` (`PROFILE_FILE`, `RESUME_CONFIG_FILE`, `HOME_CONFIG_FILE`), mirrored by an allow list `CONFIG_FILES` in `functions/src/cms.ts` that makes `getConfig` refuse any other name (it must not read arbitrary CMS files). On the Next.js side one `configLoader` (`src/middleware/configService.ts`) owns the call, the 30 s cache and the stale-copy fallback; `profileService.ts`, `resumeConfigService.ts` and `homeConfigService.ts` keep only their parsing and fallback. `getConfig` replaces the other two functions in `function_names`. The home config uses `withDefaults` over `src/data/home-config.example.json`, a sanitizer in `src/lib/` typed by `src/data/homeConfig.ts`. The root layout loads it next to the profile and a `HomeConfigProvider` exposes `useHomeConfig()`, or the landing page receives it as a prop from a server component; the exact choice follows how `ProfileProvider` is wired (assumption: provider, to match). `cms.ts` always lists `home-config.json` and opens the example as unsaved until first saved, like `resume-config.json`.
6. **Initial home config keys (placeholders):** `title`, `tagline`, `signInLabel`, `signedInTitle`, `signedInMessage`, `openMenuLabel`, `aboutLabel`, `aboutHref`. The owner edits values later; adding keys later means updating the type and the example together.
7. **Release notes** keep their `pathname !== '/'` guard, so removing them from `/about` needs no code change beyond confirming the About page does not render them; the layout still includes the component on every page. The spec states the observable behavior.
8. **Back link on `/about`.** The About navbar gets a visible "Main site" link to `/` (label from the profile, new `nav` key with example fallback). `AdminNav` and `ResumeNav` already link to `/`, which is now the landing page; unchanged.
9. **Metadata.** `generateMetadata` keeps the profile title for the whole site; no per-route metadata in this change (assumption, can follow later).

## Risks / Trade-offs

- A second public route widens the unauthenticated surface; mitigated by keeping `PUBLIC_PATHS` to exactly `/`, `/about`, `/api/auth/session` and checking default-deny still holds for every other path.
- Removing `getProfile` and `getResumeConfig` is a function delete, which the plan guard blocks (Cloud Functions are protected types) until an operator approves it, and stage 2 runs before the app rollout, so the previously deployed app would call a function that no longer exists. Mitigation: deploy in two steps (first the app and `getConfig`, then remove the old functions), or approve the delete knowing the dev/prod window; this is the owner's call at deploy time.
- `getConfig` takes a file name, so it must keep the allow list; widening it would expose other CMS files.
- Existing shared links to `/` now show the landing page, not the bio; the owner shares `/about` instead (intended).
- The "About me" item needs a stored profile that includes it; `withDefaults` fills it from the example only when the key is absent, and an existing stored `drawerItems` array replaces the example's array, so the owner must add the item to the stored profile once (documented in the tasks).
