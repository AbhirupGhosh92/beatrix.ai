# admin-cms Specification

## Purpose
Let an allow-listed admin list, read and save the JSON content files in Storage through `/admin`, with the browser never calling Cloud Functions directly.

## Requirements

### Requirement: Browser reaches the backend only through the Next.js server
The `/admin` page SHALL call `/api/admin/cms` with `Authorization: Bearer <Firebase ID token>`, and the route SHALL forward it to private Cloud Functions authenticated with a Google ID token for the App Hosting service account.

#### Scenario: Missing token
- **WHEN** a request to `/api/admin/cms` has no bearer token
- **THEN** the response is 401 "Admin sign-in required." with `Cache-Control: no-store`

### Requirement: Only verified admins may use the admin functions
The admin functions SHALL verify the forwarded Firebase ID token, require a verified email, and require that the `allowed_emails/{email}` entry resolves to a role holding the `cms:write` permission (the `admin` role) and is not `allowed: false`.

#### Scenario: Signed-in non-admin
- **WHEN** a valid token belongs to an email whose role lacks `cms:write` (for example `reader`, `user-base` or `user-advanced`)
- **THEN** the function responds 403 and nothing is read or written

#### Scenario: Invalid or expired token
- **WHEN** the token fails verification
- **THEN** the function responds 401

#### Scenario: Legacy admin entry
- **WHEN** an entry has `admin: true` and no `role`
- **THEN** it resolves to the `admin` role and is allowed

### Requirement: Restricted file names and size
Editable files SHALL live under `cms/` in the default bucket, names SHALL match letters, digits, `-` or `_` followed by `.json`, and a file SHALL NOT exceed 5 MB.

#### Scenario: Invalid name
- **WHEN** a request names a file such as `../x.json`
- **THEN** the function responds 400

### Requirement: Saves keep the previous version
Before overwriting an existing file, the function SHALL copy it to `cms-backups/<filename>.<timestamp>`.

#### Scenario: Save over existing profile
- **WHEN** an admin saves `profile.json`
- **THEN** the old content is available under `cms-backups/` and the new content is live

### Requirement: Storage is closed to clients
`storage.rules` SHALL deny all direct client access to Storage.

#### Scenario: Direct client read
- **WHEN** a browser SDK tries to read `cms/profile.json`
- **THEN** access is denied

### Requirement: Admin panel is gated before it is served
The `/admin` page SHALL be served only to a session whose role holds `cms:write`; every other request SHALL be denied by the route gate defined in `access-control` before any admin page content is sent.

#### Scenario: Logged-out visitor opens /admin
- **WHEN** a visitor without a session requests `/admin`
- **THEN** they are redirected to `/` and no admin page content is served

#### Scenario: Signed-in non-admin opens /admin
- **WHEN** a signed-in `reader`, `user-base` or `user-advanced` requests `/admin`
- **THEN** they are redirected to `/` and no admin page content is served

### Requirement: Admin area has a top navbar
`/admin` SHALL show a top navbar with a CMS entry (`/admin/cms`) and an Access entry (`/admin/access`), highlight the current one, and redirect `/admin` to `/admin/cms`.

#### Scenario: Navigate between sections
- **WHEN** an admin clicks Access in the navbar
- **THEN** the Access page opens and Access is highlighted, with the CMS editor one click away

#### Scenario: Bare admin URL
- **WHEN** an admin opens `/admin`
- **THEN** they are redirected to `/admin/cms`

### Requirement: Resume config can be created from the CMS
The admin file list SHALL always include `resume-config.json`, whether or not it has been saved yet. Opening it before it exists SHALL show the default resume config as unsaved content, so saving once creates the file with working values.

#### Scenario: File not created yet
- **WHEN** an admin opens `resume-config.json` and no stored file exists
- **THEN** the editor shows the default resume config, marked as unsaved, and the list shows the file as not yet created

#### Scenario: Saving creates it
- **WHEN** the admin saves that content
- **THEN** `cms/resume-config.json` exists with those values and the next resume builder request uses them

#### Scenario: Existing file untouched
- **WHEN** a stored `resume-config.json` exists
- **THEN** the editor shows the stored content and never replaces it with the default
