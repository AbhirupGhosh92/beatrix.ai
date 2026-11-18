# Evidence for #134 (personal blog)

Scenario and command results from the Tester on tip 61ea11b (the PR tip adds only task ticks and the archive):

- `npm run check`, `npm run build`, `npm run functions:build`, `npm run infra:check`: pass.
- `scripts/check-functions.sh`: 23 exported functions match `function_names` (`blog` included).
- `python3 scripts/deploy/test_plan_guard.py`: 16 tests OK (new blog bucket delete/replace blocked).
- `npm run check:blog`: `blog contract: OK` (real compiled function against an in-memory Firestore/Storage/Auth fake, responses passed through the site's unwrap helpers).
- `openspec validate personal-blog --strict` valid; `openspec validate --all` 20 passed, 0 failed (after archive too).
- Public headers response keys are exactly `id,title,excerpt,tags,publishedAt` (a stub returning `body` and `authorEmail` showed them stripped in `/api/blog/headers`).
- Markdown preview rendered with `react-dom/server` against a crafted body: `<script>`, raw `<img onerror>`, raw `<a href="javascript:">`, remote images and `blog-image:../../x` dropped; `javascript:`/`data:` links became plain text; `blog-image:<id>` mapped to `/api/blog/<postId>/images/<id>`.
- Anonymous requests: `/blog` 307 to `/`, `/api/blog` 401, `/api/blog/config` 401, `/api/blog/headers` 200.

Screenshots (home block with the headers endpoint stubbed, `npm run dev`; the orange "1 Insight" chip is Next's dev overlay):

- `home-blog-light-1280.png`, `home-blog-dark-1280.png`
- `home-blog-light-375.png`, `home-blog-dark-375.png` (scrolled to the bottom, heading hidden under the sticky bar), `home-blog-light-375-heading.png` (light, shows the heading)
- Titles and excerpts containing `<b>` and `<script>` are shown as text.

Not captured: the signed-in `/blog` editor, real Firestore/Storage behavior, blog-off in a browser, 320 px.
