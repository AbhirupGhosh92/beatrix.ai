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
The admin functions SHALL verify the forwarded Firebase ID token, require a verified email, and require the `allowed_emails/{email}` document to have `admin: true` and not `allowed: false`.

#### Scenario: Signed-in non-admin
- **WHEN** a valid token belongs to an email without `admin: true`
- **THEN** the function responds 403 and nothing is read or written

#### Scenario: Invalid or expired token
- **WHEN** the token fails verification
- **THEN** the function responds 401

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
