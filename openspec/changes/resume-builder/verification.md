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

## 2. Resume config (task 2.2)

| ID | Do | Expect |
|---|---|---|
| T2.1 | With no `resume-config.json` stored, open a resume, look at the template list | Classic, Modern, Sidebar |
| T2.2 | In `/admin/cms` create `resume-config.json` (paste `src/data/resume-config.example.json`), set `limits.baseMaxResumes` to 2, save, wait 40 s | Base A sees "x of 2 used" without a rebuild |
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

## Report back

For every FAIL: the case ID, what you did, what you saw, and for API cases the status code and body. Function logs help: `firebase functions:log --project beatrix-ai-dev --only resumeCreate` (or the function name involved).
