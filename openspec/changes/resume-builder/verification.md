# Resume builder: dev verification checklist

Run these on **dev** (`beatrix-ai-dev`) after deploying. Mark each case PASS or FAIL and report the IDs of failures with what you saw. Task numbers refer to `tasks.md`.

## 0. Set up (once)

**0.1 Create the bucket** (the functions fail with a storage error until it exists). From the repo root, with `gcloud auth login` done:

```bash
cd terraform
terraform init -reconfigure -backend-config="bucket=beatrix-ai-dev-tfstate"
terraform plan -var-file=environments/dev.tfvars -out=tfplan
terraform show -json tfplan > plan.json && python3 ../scripts/deploy/plan_guard.py plan.json
```

Expect: the plan **creates** `google_storage_bucket.resumes_storage` and nothing is deleted or replaced; the guard says it passed. Then `terraform apply tfplan` and `cd ..`. (Task 3.1: also run `terraform fmt -check` here.)

**0.2 Deploy only the functions** (after `firebase login`):

```bash
./scripts/deploy-backend.sh beatrix-ai-dev --components functions
firebase functions:list --project beatrix-ai-dev | grep -iE "resume"
```

Expect 8 functions: `getResumeConfig`, `resumeList`, `resumeGet`, `resumeCreate`, `resumeSave`, `resumeDelete`, `adminListResumeOwners`, `adminPurgeResumeOwner`.

**0.3 Point local at dev** in `.env.local` (`./scripts/recreate-environment.sh dev` writes it, or set by hand):

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=beatrix-ai-dev
FUNCTIONS_CALLER_SERVICE_ACCOUNT=firebase-app-hosting-compute@beatrix-ai-dev.iam.gserviceaccount.com
```

plus the `NEXT_PUBLIC_FIREBASE_*` web config. Run `pnpm install && npm run dev`.

**0.4 Turn the feature on.** In `/admin/cms`, in the stored `profile.json`, set `nav.drawerItems` to the object with `"id": "resume-builder"`, `"href": "/resume-builder"`, `"enabled": true`. The profile is cached about 30 seconds on the server.

**0.5 Accounts.** Sign in with Google accounts and set roles at `/admin/access`: **Admin** (you), **Base A**, **Base B** (role `user-base`), **Adv C** (role `user-advanced`), **Reader D** (role `reader`, the default for a new sign-in). Use separate browser profiles so you can stay signed in as several at once.

**Handy:** a user's session cookie is `__session` (DevTools, Application, Cookies). For API cases use `curl -b "__session=<value>" http://localhost:3000/...`.

## 1. Menu and gate (tasks 1.3, 1.4)

| ID | Do | Expect |
|---|---|---|
| T1.1 | Anonymous: open `/resume-builder`, `/api/resumes`, `/` | page redirects to `/`; API 401; `/` loads |
| T1.2 | Reader D: open the drawer, then `/resume-builder`, then `/api/resumes` | no Resume builder entry; redirect to `/`; API 403 |
| T1.3 | Base A: open the drawer, click Resume builder | entry shown; builder opens |
| T1.4 | Admin: same | entry shown; builder opens |
| T1.5 | Set `enabled` to `false`, wait 30-40 s, reload as Base A and as Admin | entry gone; `/resume-builder` shows 404; `/api/resumes` is 404 for both |
| T1.6 | Replace the item with the old string form (`"Sidebar Item 1"`), reload | no error; nothing shown in the drawer |
| T1.7 | Set it back to enabled; check the drawer in light and dark theme | entry readable in both; icon aligned |
| T1.8 | Item **disabled**: sign in as Base A and Reader D | **no menu button and no drawer**; the top bar (brand, theme toggle, account menu) stays |
| T1.9 | Item disabled: sign in as Admin | menu button still there; the drawer lists only the Admin CMS link |
| T1.10 | Anonymous visitor | no menu button; brand and theme toggle visible |
| T1.11 | Item enabled again (wait 40 s) as Base A | the menu button reappears |

## 2. Resume config (task 2.2)

| ID | Do | Expect |
|---|---|---|
| T2.0 | Open `/admin/cms` and the file dropdown | `resume-config.json (Resume builder) (New)` is listed; opening it shows the default config as unsaved; reloading the page without saving leaves nothing stored |
| T2.1 | With no `resume-config.json` stored, open a resume, look at the template list | Classic, Modern, Sidebar |
| T2.2 | In `/admin/cms` pick **resume-config.json (Resume builder) (New)** from the file list (it opens pre-filled with the default config, marked Unsaved Changes), set `limits.baseMaxResumes` to 2, **Save File**, wait 40 s | Base A sees "x of 2 used" without a rebuild |
| T2.3 | Set one template `"enabled": false` | it disappears from the picker |
| T2.4 | Set another template's `layout` to `"fancy"` | that template is skipped, the page still works |
| T2.5 | Set `baseMaxResumes` to `0` | the cap shows 3 again (an invalid limit silently falls back to the example) |
| T2.6 | Restore the config to the example, wait 40 s | back to 3 and all templates |

## 3. Builder and form (tasks 4.1 to 4.5)

| ID | Do (as Base A) | Expect |
|---|---|---|
| T3.1 | Open the builder with no resumes | "no resumes yet" message and the create form |
| T3.2 | Create "First" | opens an editor with **empty** fields showing grey example text (placeholders), required fields marked `*` |
| T3.3 | Look at the right panel without typing | "n fields need attention"; Generate is **disabled** |
| T3.4 | Enter a bad email, tab away | error under the field; fixing it clears the error |
| T3.5 | Bad phone (`abc`), link (`ftp://x`), month (`2021-13`) | each shows its error |
| T3.6 | Type past the limit in the Summary or headline | the browser stops at the limit |
| T3.7 | Experience: Add entry, fill, Remove entry; keep adding | add button disables at 20 entries |
| T3.8 | Fill the required fields correctly | the attention panel disappears; Generate enables |
| T3.9 | Back to the list, create resumes until the cap | counter "3 of 3 used"; Create disabled with a delete hint; delete one and Create works again |
| T3.10 | Delete: click the bin, then Cancel, then again and Confirm | needs two clicks; resume gone from the list |
| T3.11 | Check 320 px, 768 px and 1440 px wide, both themes | no horizontal scroll; the form and side panel stack on small screens |

## 4. Saving (tasks 4.3, 3.3)

| ID | Do | Expect |
|---|---|---|
| T4.1 | Base A: edit a field | status "Unsaved changes"; Save enabled |
| T4.2 | Try to close or reload the tab | browser warns about unsaved changes |
| T4.3 | Save, reload, reopen | content is there; incomplete drafts also save |
| T4.4 | Rename the resume and save | the list shows the new name and a new "Updated" time |
| T4.5 | Adv C: edit a field and wait about 2 s | "All changes saved" with no button press |
| T4.6 | Adv C: open the same resume in two tabs, edit and let tab 1 autosave, then edit tab 2 | tab 2 shows the "changed elsewhere" banner with Reload and does **not** overwrite tab 1 |

## 5. Structure editing (task 4.4)

| ID | Do | Expect |
|---|---|---|
| T5.1 | Base A: look for "Edit structure" | not shown |
| T5.2 | Adv C: open "Edit structure" | JSON of the 5 default sections |
| T5.3 | Add a section `{"id":"languages","title":"Languages","fields":[{"id":"list","label":"Languages","type":"bullets"}]}`, Apply | new section appears in the form; existing values kept |
| T5.4 | Type broken JSON, Apply | "not valid JSON" |
| T5.5 | Use `"type": "image"` or an uppercase id | rejected with the reason; previous structure stays |
| T5.6 | Reload | the custom structure persists |
| T5.7 | API as Base A: `PUT /api/resumes/<id>` with a `structure` in the body (copy the request from the Network tab) | 400 "Your role uses the default structure." |

## 6. Export (tasks 5.x)

Use a fully valid resume with a couple of jobs and bullets.

| ID | Do | Expect |
|---|---|---|
| T6.1 | Format Markdown, Generate | one `.md` file; template picker disabled with a note |
| T6.2 | Word, template Classic, Generate | one `.docx`; opens in **Word**; Heading styles used; dates right-aligned; File, Save as PDF keeps the layout |
| T6.3 | PDF, each of the 3 templates | each downloads one PDF with a distinct look; Sidebar has a coloured side column |
| T6.4 | Press Generate once | exactly one download |
| T6.5 | Put `नमस्ते` or an emoji in the summary, PDF | PDF shows `?` for them and the page warns; DOCX and Markdown keep them |
| T6.6 | Look at all outputs | no watermark anywhere |
| T6.7 | DevTools Network while loading the builder page | the PDF and DOCX scripts are **not** fetched until Generate |
| T6.8 | Empty a required field | Generate disabled again |
| T6.9 | Format PDF or Word: look under the Template select | a preview of the chosen template appears with **sample** content (not your resume) |
| T6.10 | Switch between Classic, Modern and Sidebar | the preview changes style and layout each time; the Sidebar one has a coloured side column |
| T6.11 | Switch the format to Markdown | the preview disappears |
| T6.12 | Adv C with a custom structure (T5.3) | preview still draws, using sample content that fits the custom sections |
| T6.13 | Open the builder on a phone or a browser without an inline PDF viewer | an "Open preview" link instead of an empty frame; it opens the PDF |
| T6.14 | DevTools Network: reload the builder, open a resume | the PDF script loads only once the preview appears, not on page load |

## 7. Privacy (task 3.3)

Get an id from the Network tab (`/api/resumes` response) while signed in as Base A: `ID_A`.

| ID | Do | Expect |
|---|---|---|
| T7.1 | As Base B: `GET /api/resumes/ID_A` | 404, no data |
| T7.2 | As Admin: same | 404 |
| T7.3 | As Base B: `PUT` and `DELETE` on `ID_A` | 404 each; A's resume unchanged |
| T7.4 | As Base B: `POST /api/resumes` with body `{"title":"x","owner":"<A's email>"}` | creates in **B's** list; A's list unchanged |
| T7.5 | As Base B: the list API | only B's resumes |
| T7.6 | As Reader D: `GET /api/resumes` | 403 |
| T7.7 | As Base A: `GET /api/admin/resumes` (cookie only) | 401/403, nothing returned |

## 8. Cap under parallel requests (task 3.3)

| ID | Do | Expect |
|---|---|---|
| T8.1 | Base A with exactly 2 resumes and cap 3: run two `curl -X POST ... /api/resumes` at the same time (`&` in the shell) | one 200, one 409 |
| T8.2 | Check the list | exactly 3 resumes |
| T8.3 | Adv C creates 6 resumes | all succeed (no cap) |
| T8.4 | Change Adv C to `user-base` at `/admin/access` (with more than 3 resumes), reload | can open, edit, export and delete; Create is refused until under the cap |

## 9. Retention (tasks 3.1, 6.3)

`HASH` = `printf '%s' '<owner email>' | sha256sum`.

| ID | Do | Expect |
|---|---|---|
| T9.1 | `gcloud storage buckets describe gs://beatrix-ai-dev-resumes --format="json(versioning,lifecycle_config,public_access_prevention)"` | versioning on; a Delete rule at 30 days since noncurrent; public access enforced |
| T9.2 | Delete a resume in the UI, then `gcloud storage ls --all-versions gs://beatrix-ai-dev-resumes/owners/HASH/` | the deleted resume still has a noncurrent version listed |
| T9.3 | Restore it with the `gcloud storage cp '...#<generation>' ...` recipe in `docs/DEPLOYMENT.md` 10.1b | it reappears in the owner's list; then fix `resume_owners/<email>.count` as the doc says |

## 10. Admin cleanup (tasks 6.1, 6.2, 6.3)

| ID | Do | Expect |
|---|---|---|
| T10.1 | Admin: open `/admin/access` with all users active | "Resume data without access": none |
| T10.2 | Revoke Base B (who has resumes) | B can no longer sign in |
| T10.3 | Refresh the table | B's row: email, resume count, size, last change; **no titles or text**; DevTools response has only `email, count, bytes, updatedAt` |
| T10.4 | Restore B, check B's resumes | all there and unchanged; B's row gone from the table |
| T10.5 | Revoke B again; click Delete data | asks you to type the email; **Delete permanently** stays disabled for a wrong or partial email |
| T10.6 | Type B's email, confirm | row disappears; success toast with a file count |
| T10.7 | `gcloud storage ls --all-versions gs://beatrix-ai-dev-resumes/owners/HASH_B/` | nothing left, including older versions |
| T10.8 | Firestore: `resume_owners/<B>` and `resume_audit` | index doc gone; an audit entry with admin, owner, time, objects |
| T10.9 | Set the menu item `enabled` to `false` (wait 40 s) and reload `/admin/access` | the table still works |
| T10.10 | As Base A: `POST /api/admin/resumes` | 401/403, nothing deleted |
| T10.11 | Optional (needs your Firebase ID token from DevTools): `POST /api/admin/resumes` with `Authorization: Bearer <token>` and `{"email":"<an active user>","confirmEmail":"<same>"}` | 409 "still has access", nothing deleted (the UI never offers active users) |

## 11. Deployment safety (task 3.5)

| ID | Do | Expect |
|---|---|---|
| T11.1 | `bash scripts/deploy/components.sh hash functions` before and after editing a tracked file in `functions/src/` (it hashes tracked files only, so `git add` new ones) | the hash changes |
| T11.2 | Same command after editing only `README.md` | unchanged |

## Spec scenario coverage (task 7.1)

Every scenario in the change's spec deltas, with how it was checked in the build environment (no cloud login) and what is left for dev.

Legend: **Run** = executed here against the real code. **Stand-in** = real function/service code run against an in-memory model of Firestore and Storage (or with only the network stubbed), so logic is proven but Google's actual behaviour is not. **Dev** = only checkable on a deployed project (case IDs above).

Evidence names: `fn` = resume and admin functions harness (44 checks), `chain` = CMS save to function to service (16), `proxy` = the real `proxy()` with session and profile stubbed (28), `ui-builder` = the real builder components in Chromium with the compiled CSS and a mock API (56), `ui-cms` = the real CMS page (13), `ui-orphans` = the admin table (15), `ui-preview` and `ui-export` = preview and export in Chromium, `ui-themes` = no horizontal scroll at 320, 768 and 1920 px in both themes, `unit` = validators, sanitizer, menu helper, plan guard (10 tests), `build` = typecheck, lint, `npm run build`, functions build.

### access-control
| Scenario | Status | Evidence / left for dev |
|---|---|---|
| Disabled item | Run | `proxy`: page 404 rewrite and API 404 JSON for base, advanced and admin. Dev: T1.5 |
| Config unavailable | Stand-in | `proxy` with the unreadable-config fallback modelled (items off); the real `getProfile` fallback to the example is by code reading. Dev: T1.5 |
| Flag does not grant access | Run | `proxy`: enabled flag with a reader still gets the redirect or 403 |
| Reader requests the builder | Run | `proxy`: redirect to `/`. Dev: T1.2 |
| Reader calls the API | Run | `proxy`: 403 for `/api/resumes` and `/api/resumes/config`. Dev: T1.2, T7.6 |

### admin-cms
| Scenario | Status | Evidence / left for dev |
|---|---|---|
| File not created yet | Run | `chain` (listed, exists false), `ui-cms` (opens as the default, unsaved, "(New)"). Dev: T2.0 |
| Saving creates it | Stand-in | `chain` and `ui-cms` (Save posts the default). Dev: T2.2 |
| Existing file untouched | Run | `ui-cms`: stored content shown as is, not dirty |

### deployment-pipeline
| Scenario | Status | Evidence / left for dev |
|---|---|---|
| Plan deletes the resumes bucket | Run | `unit`: delete and replace blocked, update passes; fails without the protection (mutation check). Dev: T0.1 plan |
| Unrelated change | Run | `components.sh hash`: functions and apphosting hashes unchanged by a docs-only edit, functions hash changes when a function changes. Dev: T11 |

### profile-content
| Scenario | Status | Evidence / left for dev |
|---|---|---|
| Item turned off | Run | `unit` (menu helper), `proxy`. Drawer look: T1.5 |
| Old string items | Run | `unit`: strings load as disabled entries. Dev: T1.6 |
| Missing flag | Run | `unit`: missing or non-boolean `enabled` is off |
| Nothing to show | Run | `unit`: reader and base with nothing enabled get no menu. Rendered page: T1.8 |
| Admin | Run | `unit`: admin keeps the menu with nothing enabled. Rendered page: T1.9 |
| Entry enabled | Run | `unit`. Rendered page: T1.3, T1.11 |
| Anonymous | Run | `unit`: no menu; the top bar is untouched by this change. Rendered page: T1.10 |

### resume-builder
| Scenario | Status | Evidence / left for dev |
|---|---|---|
| Enabled item for a base user | Run | `proxy` (passes the gate), `unit` (entry listed). Rendered drawer: T1.3 |
| Reader / Item disabled (gate) | Run | `proxy` |
| Base user form | Run | `ui-builder`: default structure fields, no structure editor for base |
| Base user cannot change the structure | Run | `fn` (400), `ui-builder` (no editor) |
| Untouched form | Run | `ui-builder`: empty fields, placeholders only, Generate disabled, 4 required fields listed |
| Invalid field | Run | `ui-builder`: email, phone and link errors, cleared on fix |
| Server revalidates | Run | `fn` (unknown section, wrong shape), `unit` (size and length limits) |
| Save an incomplete draft | Run | `fn`, `ui-builder` |
| Base user explicit save | Run | `ui-builder`: Save needed, leave-page confirmation |
| Advanced autosave | Run | `ui-builder`: saved after about 1.5 s with no Save button |
| Stale autosave | Run | `fn` (409 on old generation), `ui-builder` (conflict banner with Reload). Real Storage generations: T4.6 |
| Fourth resume for a base user | Run | `fn`, `ui-builder` |
| Parallel creates | Stand-in | `fn`: exactly one of two succeeds, with transactions serialised by the model. Real Firestore: T8.1 |
| Downgrade | Run | `fn`: lists all, can open and edit, cannot create until under the cap |
| Valid custom structure / Invalid structure | Run | `ui-builder`, `fn`, `unit` |
| Disabled template | Stand-in | `chain` (disabled kept in config), the route's filter by reading the code. Dev: T2.3 |
| Unknown value in a template | Run | `unit`, `chain`: skipped with a warning. Dev: T2.4 |
| Picking a template / Switching template | Run | `ui-preview`, `ui-builder`. Embedded PDF display: T6.9, T6.10 |
| Own data untouched | Run | the preview takes only the template and the structure; `ui-builder` checks the caption and sample-only content |
| Markdown | Run | `ui-builder`: no preview, template select disabled |
| No inline PDF viewer | Run | `ui-preview` (both branches). A real phone: T6.13 |
| Generate a PDF | Run | `ui-export`, `ui-builder`: valid PDFs, distinct per template, rasterised and read |
| Generate DOCX | Run | `ui-export`: real styles, no tables, converts to PDF in LibreOffice. **Not run in Microsoft Word**: T6.2 |
| Only one output at a time | Run | `ui-builder`: 3 clicks, 3 downloads |
| Other user's resume | Run | `fn`: 404 on get, save and delete. Real: T7.1, T7.3 |
| Admin (cannot read others) | Run | `fn`: 404. Real: T7.2 |
| Owner claimed in the request | Run | `fn`; the route forwards only title, structure and data (code). Real: T7.4 |
| Changed Google email | Run | by construction (owner is the verified email); `fn` shows a second user sees only their own |
| Config edited / Key missing | Stand-in | `chain`, `unit`. Dev: T2.2, T2.6 |

### resume-data-retention
| Scenario | Status | Evidence / left for dev |
|---|---|---|
| User deletes a resume | Stand-in | `fn`: removed for the user, older versions kept. Real bucket: T9.2, T9.3 |
| Window passes | Dev | cannot be run in a session; the 30-day rule is checked in T9.1 |
| Revoke and restore | Run | `fn`: data kept, returned unchanged. Dev: T10.2, T10.4 |
| Revoked user cannot read | Run | `fn` |
| Orphan appears / Active user hidden | Run | `fn`, `ui-orphans` |
| No content exposed | Run | `fn` (row keys are exactly email, count, bytes, updatedAt), `ui-orphans` (columns). Network check: T10.3 |
| Delete an orphan | Stand-in | `fn`: every version removed, index cleared, audit written. Real GCS delete-by-generation: T10.7, T10.8 |
| Active owner / Wrong confirmation / Not an admin | Run | `fn`, `ui-orphans` |

### Not run anywhere in this environment
- `terraform fmt`, `terraform plan` and `apply` (no Terraform CLI or cloud login), and any deploy.
- Microsoft Word, a real phone, and a desktop browser's built-in PDF viewer inside the preview frame.
- The real Firestore and Google Cloud Storage behaviours that the stand-ins model: generation preconditions, listing and deleting noncurrent versions, transaction retries, lifecycle expiry.
- The rendered landing page and drawer (the page needs the live site); the menu rule itself is covered by `unit`.

## Dev result

The owner ran this checklist on `dev` after deploying and reported that the resume builder works properly. The dev-only tasks were ticked on that statement; individual case results were not itemised, so any case that matters for release (for example T6.2 in Microsoft Word, T9.3 restore, T10.7 purge) is worth a second look before prod.

## Report back

For every FAIL: the case ID, what you did, what you saw, and for API cases the status code and body. Function logs help: `firebase functions:log --project beatrix-ai-dev --only resumeCreate` (or the function name involved).
