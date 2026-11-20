# Evidence for #143 (Medium-style editor and reader)

No screenshots: the changed pages need a published post or an author or signed-in session, and the Cloud Functions are not reachable from a local checkout, so no changed page can be rendered locally. Screenshots and the browser scenarios are to be captured on the dev environment after merge (see the PR).

## Command results (Tester, branch head e40f076)
- `npm run check` (typecheck + lint): pass
- `npm run check:blog`: "blog contract: OK"
- `npm run build`: pass on retry (the first run stops on a Next 16.4.3 security notice, SecurityFatalError, then succeeds)
- `openspec validate medium-style-editor-and-reader --strict`: valid; `openspec validate --all`: 21 passed, 0 failed

## Anonymous HTTP checks (production build, port 3100)
| Request | Status |
|---|---|
| GET `/`, `/about`, `/api/blog/headers` | 200 |
| GET `/posts/x`, GET `/api/posts/x/engagement` (unknown post) | 404 |
| GET `/bookmarks`, `/blog` | 307 to `/` |
| POST `/api/posts/x/like`, `/bookmark`, `/comments` | 401 |
| DELETE `/api/posts/x/comments/c1` | 401 |
| GET `/api/bookmarks`, `/api/blog/config` | 401 |

## Not verified (no browser run possible locally)
All 14 scenarios were checked by code review and the HTTP checks above only. Still to verify on dev: floating toolbar, "+" insert menu, keyboard and touch use, legacy and #141 posts opening, byline and read time, captions, 320px / 375px / desktop in both themes, reader options persisting, anonymous sign-in prompt, like, bookmark, comment and removal while signed in, `/bookmarks`, rate limits.
