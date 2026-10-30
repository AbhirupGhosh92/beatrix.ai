# Design

## Context

See proposal.md for motivation. Relevant current state:

- Architecture is browser → Next.js server (`src/middleware/`, `src/app/api/`) → private Cloud Functions → Storage/Firestore. The browser never calls a function; every function verifies a forwarded Firebase ID token and knows the caller's verified email.
- `src/lib/access.ts` is the only access policy (`can()`, `requiredPermission()`); `functions/src/policy.ts` mirrors it. `src/proxy.ts` gates every request.
- The profile is JSON in `cms/` served by `getProfile()` (cached ~30s, filled from `profile.example.json`). `nav.drawerItems` is currently a `string[]` rendered as dead links.
- The CMS bucket is versioned with a 90-day noncurrent rule and `prevent_destroy`; `storage.rules` denies all client access. Deploys redeploy only components whose hash changed (`scripts/deploy/components.sh`).
- `allowed_emails/{email}` is the user record; `resolveRole()` returns null for no access.

## Goals / Non-Goals

**Goals:**
- Follow the existing three-hop pattern and role policy, adding no new trust boundary.
- Make isolation depend on the verified session email only.
- Keep rendering entirely in the browser and keep the main bundle unchanged (dynamic import).

**Non-Goals:**
- Server-side rendering, sharing, import, restore UI, email-change migration.
- Changing roles or permissions; `features:basic` already exists.

## Decisions

**1. Menu flag lives on each `nav` item; the gate reads it on the server.**
`nav.drawerItems[]` entries are `{id, label, href, icon, enabled}`. A `FEATURE_ROUTES` table in `access.ts` maps a path prefix to an item `id`. The proxy and the API routes call `getProfile()` (already cached) and answer 404 when the item is off or missing. Permission stays in code (`ROUTE_PERMISSIONS`); config can only close a route, never open one. If the profile cannot be loaded the feature route stays closed.
*Alternative:* flag in the resume config. Rejected: the proxy would load a second config for every request, and the menu needs the flag anyway.

**2. Compatibility for old `drawerItems` strings.** `getProfile()` maps a string to `{label, enabled: false}` and fills missing `enabled` as false, so an old stored profile can never surface a link unintentionally. The example profile ships the new shape with the resume item enabled only where the admin chooses.

**3. Separate resume config.** `cms/resume-config.json` plus `resume-config.example.json`, a `getResumeConfig` function, `resumeConfigService.ts` (cached ~30s, example fallback). It holds `templates[]`, `limits` (`baseMaxResumes: 3`), `defaultStructure` (the standard `resume_structure`) and `structureRules`. The existing admin CMS file list and editor handle it without code changes. The main profile keeps only landing page and menu content.

**4. Storage layout and isolation.** A new bucket `<project>-resumes-<env>` (not the CMS bucket, so PII has its own retention and IAM). Objects are `owners/<sha256(email)>/<resumeId>.json`; the email is hashed so it never appears in object names or logs. Firestore `resume_owners/{email}` is the index: `{ count, bytes, ids[], updatedAt }`. Functions derive the owner from the verified `__session` cookie (forwarded by the Next.js server; `requireSession`) and ignore any owner in the body; a resume id is only ever resolved inside the caller's own prefix, so another user's id is a plain 404.
*Alternative:* uid-keyed paths. Rejected by decision: `allowed_emails` is email keyed and a changed Google email is a new user.

**4b. Config reaches the functions from the server.** The functions do not re-read or re-sanitize the resume config: the Next.js server sends the already-sanitized `baseMaxResumes`, structure rules and default structure with each call. Only the site can invoke the functions (IAM) and the config is admin data, so this avoids a second copy of the merge and sanitize logic; the user's identity is still verified inside the function.

**5. Cap and write ordering.** Create runs a Firestore transaction on the owner index: it checks the role-based cap, adds the id and returns, then the function writes the object. If the object write fails the id is released. Parallel creates serialize on the index doc, so exactly the allowed number succeed. The cap is read from the resume config, not hard-coded. Downgraded users keep everything but cannot create.

**6. Drafts and stale writes.** Save accepts any content inside size and shape limits (structure validity is only required to generate). Each save carries the object's Storage generation as an `ifGenerationMatch` precondition; a mismatch returns 409 and the client asks the user to reload. This protects autosave from a second tab.

**7. Validation in two places from one source.** The structure file drives both the form validators and the server check. Shared validation code lives in a small pure module that the Next app imports and `functions/` mirrors (the same arrangement as `policy.ts`), since `functions/` is a separate package. Structure files from advanced users are checked against `structureRules` (allowed field types, max sections/fields/lengths, max depth) so the stored file cannot grow into arbitrary data.

**8. Export pipeline.**
```
structure + data --> document model (sections of typed blocks)
                          |
        template tokens + layout id
                          |
              +-----------+-----------+
              v           v           v
            pdf          docx         md     (each dynamically imported)
```
A template is a closed token set (fonts from a short list, sizes, colors, spacing) plus a layout id implemented in code. PDF and DOCX renderers consume the same document model so content cannot diverge. Fonts are limited to names that exist both as PDF standard fonts and Word defaults (for example Helvetica/Arial, Times/Times New Roman), which keeps DOCX → PDF conversion faithful. DOCX uses heading/paragraph styles and bullet lists only; no layout tables, no text as images. All user text is escaped or inserted as plain text runs, never as markup. Libraries: `@react-pdf/renderer` for PDF (declarative layouts, no canvas) and `docx` for DOCX; MD is string building.
*Alternative:* print-to-PDF from HTML. Rejected: output depends on the browser's print engine and cannot match the DOCX structure.

**9. Retention.** The resumes bucket is versioned with a `days_since_noncurrent_time = 30` rule, `force_destroy = false` and `prevent_destroy`. User delete and overwrite create noncurrent versions that expire after 30 days. Restore is an operator action (gcloud), documented in `docs/DEPLOYMENT.md`; there is no restore UI.

**10. Orphans and hard delete.** `adminListResumeOwners` queries `resume_owners` where `count > 0`, resolves each against `allowed_emails`, and returns only owners with `resolveRole()` null as `{email, count, bytes, updatedAt}`. `adminPurgeResumeOwner` requires `cms:write`, re-checks that the owner is orphaned, requires the typed email to match, deletes every object under the owner prefix with `versions: true` (all generations), removes the index doc, and writes an audit entry (`resume_audit`) with admin, owner and time. Both are exposed through `/api/admin/resumes` using the same bearer-token forwarding as the other admin routes.

**11. Deployment.** Resume functions are part of the existing `functions` component (`components.sh` hashes `functions/`), so they redeploy only when `functions/` changes; the resume config lives in `cms/`, which a deploy never writes. Terraform adds the bucket, its IAM for the App Hosting compute account and the lifecycle rule; `google_storage_bucket` is already in `PROTECTED_TYPES`, and a plan guard test covers the new bucket. `storage.rules` stays deny-all.

## Risks / Trade-offs

- [A hidden item is still a real route] → Both the proxy and the API handlers check the flag, not just the menu.
- [Client-side generation cannot be trusted or audited] → Acceptable by decision: output is the user's own data; the server only stores JSON and enforces size, shape and ownership.
- [Index and object can drift if a function fails midway] → Reserve-then-write with release on failure; the orphan list tolerates an index id with no object and the purge removes by prefix.
- [Advanced users editing structures can create huge forms] → `structureRules` caps sections, fields and lengths, enforced on the server.
- [PDF standard fonts only draw Windows-1252 characters] → Accented Latin letters, curly quotes and dashes work; other scripts (for example Devanagari, CJK) and emoji print as `?` in the PDF. The export warns the user before they rely on it and points to DOCX or Markdown, which keep full Unicode.
- [DOCX can still reflow if a recipient lacks a font] → Fonts restricted to Word defaults; exact visual parity is only promised for PDF.
- [Hard delete is irreversible] → Typed confirmation, orphan-only guard and an audit entry; user-initiated deletes keep the 30-day window.
- [Large export libraries] → Dynamically imported on the builder page only.
- [BREAKING nav shape] → Old strings load as disabled items (decision 2); the stored profile is updated through the CMS after deploy.
