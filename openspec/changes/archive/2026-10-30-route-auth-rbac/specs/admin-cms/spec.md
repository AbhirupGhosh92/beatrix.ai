# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Admin panel is gated before it is served
The `/admin` page SHALL be served only to a session whose role holds `cms:write`; every other request SHALL be denied by the route gate defined in `access-control` before any admin page content is sent.

#### Scenario: Logged-out visitor opens /admin
- **WHEN** a visitor without a session requests `/admin`
- **THEN** they are redirected to `/` and no admin page content is served

#### Scenario: Signed-in non-admin opens /admin
- **WHEN** a signed-in `reader`, `user-base` or `user-advanced` requests `/admin`
- **THEN** they are redirected to `/` and no admin page content is served
