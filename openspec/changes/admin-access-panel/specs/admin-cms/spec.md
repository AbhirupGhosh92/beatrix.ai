# Spec Delta

## ADDED Requirements

### Requirement: Admin area has a top navbar
`/admin` SHALL show a top navbar with a CMS entry (`/admin/cms`) and an Access entry (`/admin/access`), highlight the current one, and redirect `/admin` to `/admin/cms`.

#### Scenario: Navigate between sections
- **WHEN** an admin clicks Access in the navbar
- **THEN** the Access page opens and Access is highlighted, with the CMS editor one click away

#### Scenario: Bare admin URL
- **WHEN** a user opens `/admin`
- **THEN** they are redirected to `/admin/cms`

## MODIFIED Requirements

### Requirement: Only verified admins may use the admin functions
The admin functions SHALL verify the forwarded Firebase ID token, require a verified email, and require the `allowed_emails/{email}` document to have `role: "admin"` or `admin: true` and not `allowed: false`.

#### Scenario: Signed-in non-admin
- **WHEN** a valid token belongs to an email without the admin role
- **THEN** the function responds 403 and nothing is read or written

#### Scenario: Invalid or expired token
- **WHEN** the token fails verification
- **THEN** the function responds 401

#### Scenario: Legacy admin document
- **WHEN** a valid token belongs to an email whose document has `admin: true` and no `role`
- **THEN** the caller is treated as an admin
