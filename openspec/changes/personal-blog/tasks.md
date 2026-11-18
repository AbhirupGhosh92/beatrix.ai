## 1. Backend functions (owner: builder-1)

File set: `functions/src/blog.ts`, `functions/src/blogValidation.ts`, `functions/src/policy.ts`, `functions/src/cms.ts`, `functions/src/firebase.ts`, `functions/src/index.ts`.

- [x] 1.1 `policy.ts`: add `'blog:write'` and `can(role, permission, ctx?)` per design D1 (mirror of `src/lib/access.ts`, same behavior for every existing permission). Verify: `npm run functions:build` passes.
- [x] 1.2 `cms.ts`: add `BLOG_CONFIG_FILE = "blog-config.json"` to `CONFIG_FILES`, to the always-listed names and the display name "blog-config.json (Blog)". Verify: build passes; value equals `src/data/configFiles.ts`.
- [x] 1.3 `firebase.ts`: `blogBucket()` for `<project id>-blog`.
- [x] 1.4 `blogValidation.ts`: title, body size, tags (trim, lowercase, de-dup), limits, image magic-byte detection (png, jpeg, webp, gif only), excerpt builder, forwarded-config reader (writeRoles re-validated, default `["admin"]`). Verify: build passes; edge cases reasoned in the report.
- [x] 1.5 `blog.ts`: ONE exported function `blog` dispatching on `body.action` (`list`, `get`, `save`, `delete`, `imageUpload`, `imageGet`, `headers`) per D3, D4, D6, D7, D8, with shared helpers, not one function per action (ownership 404, admin keeps author, version 409 in a transaction, image count and size limits, delete removes the image prefix, headers never include email/body/images). Export from `index.ts`. Verify: build passes; report each ownership path.

## 2. Infrastructure (owner: builder-2)

File set: `terraform/main.tf`, `terraform/outputs.tf`, `terraform/functions/functions.tf`, `scripts/deploy/test_plan_guard.py`.

- [x] 2.1 `main.tf`/`outputs.tf`: bucket `blog_storage` (`${var.project_id}-blog`), same protections as `resumes_storage` (private, public access prevention, versioning, 30-day noncurrent delete, `prevent_destroy`, `force_destroy=false`), output for its name. Verify: `npm run infra:check`.
- [x] 2.2 `functions.tf`: add the single name `blog` to `function_names`. Verify: `scripts/check-functions.sh` passes once group 1 is merged (run it after the merge; before that it reports the missing exports).
- [x] 2.3 `test_plan_guard.py`: delete and replace of `blog_storage` are blocked, update is allowed. Verify: `python3 scripts/deploy/test_plan_guard.py`.

## 3. Policy, config and server (owner: builder-3)

File set: `src/lib/access.ts`, `src/lib/drawer.ts`, `src/lib/blogConfigSanitize.ts`, `src/data/configFiles.ts`, `src/data/blogConfig.ts`, `src/data/blog-config.example.json`, `src/data/profile.ts`, `src/data/profile.example.json`, `src/middleware/blogConfigService.ts`, `src/middleware/blogService.ts`, `src/middleware/routeHelpers.ts`, `src/proxy.ts`, `src/app/api/blog/**`, `src/app/layout.tsx`, `src/components/layout/BlogConfigProvider.tsx`, `src/components/layout/DrawerMenu.tsx`, `src/components/layout/NavbarDropdown.tsx`, `src/components/layout/Navbar.tsx`, `src/app/page.tsx` (only the `hasDrawerContent`/`ctx` call).

- [x] 3.1 `access.ts`: `'blog:write'`, `can(..., ctx?)` (identical rules to the functions), `ROUTE_PERMISSIONS` entries for `/blog` and `/api/blog`, `/api/blog/headers` in `PUBLIC_PATHS`, helper `isBlogRoute(path)`. Verify: `npm run typecheck`; reasoning for every route of design D2.
- [x] 3.2 Config: `BLOG_CONFIG_FILE`, `blogConfig.ts` type, example JSON, `blogConfigSanitize.ts` (design D9: per-key fallback, admin forced into `writeRoles`), `blogConfigService.ts` via `configLoader`. Verify: typecheck; invalid values fall back (reasoned or run with a short script in the scratchpad).
- [x] 3.3 `blogService.ts` (every call is `callCloudFunction('blog', { action, ... })`) + routes `/api/blog`, `/api/blog/[id]`, `/api/blog/[id]/images`, `/api/blog/[id]/images/[imageId]`, `/api/blog/config`, `/api/blog/headers` (30 s pool cache, random sample per request, `no-store`; blog-off and role checks via `blogOff()`). Only whitelisted fields are forwarded; owner and `authorEmail` from the client are never read. Image GET streams bytes with `nosniff`. Verify: typecheck, lint, build.
- [x] 3.4 `proxy.ts`: after the permission check (now `can(role, needed, { blogWriteRoles })` using the config), 404 for `/blog` and `/api/blog/*` (not `/headers`) while `enabled` is false; unreadable config keeps admin-only. Verify: typecheck; reasoning for each scenario of the `access-control` delta.
- [x] 3.5 Drawer: `BlogConfigProvider`/`useBlogConfig()` in the layout (public subset only), `ctx` threaded through `visibleDrawerItems`, `hasDrawerContent`, `visibleMenuItems` and their callers; add the `blog` entry (`/blog`, icon from the existing vocabulary or a new one added to both the type and `DrawerMenu` icon map) to `profile.example.json`/`profile.ts`. Verify: typecheck, lint, build.

## 4. Editor and home block (owner: builder-4, starts after groups 1 and 3 are merged)

File set: `src/app/blog/**`, `src/components/blog/**`, `src/components/sections/LandingBlog.tsx`, `src/app/page.tsx`, `src/store/api.ts`, `src/store/notifications.ts`, `src/lib/blogTypes.ts`, `src/styles/components/blog.css`, `src/index.css`, `package.json`, `pnpm-lock.yaml`, `package-lock.json`.

- [ ] 4.1 Dependencies `react-markdown` and `remark-gfm` (add with pnpm, keep both lockfiles current as the repo does), `blogTypes.ts`, RTK endpoints (design D10) with `SUCCESS` messages for every mutation. Verify: `npm run check`.
- [ ] 4.2 `/blog` page: list (own posts; admin toggle for all with author column), editor (title, Markdown textarea with preview tab loaded with `next/dynamic`, tags, image upload and insert, draft/publish, delete with confirm, 409 reload, limits shown from the config), Skeleton and ErrorState per `client-state`, functional components only, semantic classes and theme tokens, responsive 320-1920 px, both themes. Verify: `npm run check`, manual browser check at 375 and 1280 px in both themes.
- [ ] 4.3 Preview renderer: `blog-image:<id>` mapped to the API route, other image sources dropped, raw HTML not rendered, safe links (design D5). Verify: manual check with a crafted body (script tag, remote image, `javascript:` link).
- [ ] 4.4 `LandingBlog` on `/` for anonymous visitors (heading/intro from `useBlogConfig()`, headers from `getBlogHeaders`), nothing rendered for empty, off or failed; no other change to the product page. Verify: `npm run check`, browser check with and without posts.

## 5. Docs and wrap-up (owner: architect)

File set: `CLAUDE.md`, `docs/DEPLOYMENT.md`, `README.md` (generated sections via `scripts/update-readme.mjs`).

- [ ] 5.1 `CLAUDE.md`: blog capability (config, `blog:write`, routes, storage, the 30 s pool, the stored-profile drawer entry note). `docs/DEPLOYMENT.md`: new bucket, the single `blog` function, data protections and recovery. README structure section via the script. Verify: `node scripts/update-readme.mjs` leaves no diff.
- [ ] 5.2 Merge all Builder branches, run `npm run check`, `npm run build`, `npm run infra:check`, `scripts/check-functions.sh`, `openspec validate personal-blog --strict`, and report ready for testing.
