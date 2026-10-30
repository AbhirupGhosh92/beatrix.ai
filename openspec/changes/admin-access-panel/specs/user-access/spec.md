# Spec Delta

## Purpose

Register users automatically on their first sign-in and let admins control which onboarded users may sign in and which role they hold.

## ADDED Requirements

### Requirement: First sign-in registers the user as a reader
When a user signs in with a verified email that has no `allowed_emails/{email}` document, the system SHALL create it with `role: "reader"`, `allowed: true`, the email, display name and creation time, and SHALL sign the user in within that same request.

#### Scenario: Unknown email signs in
- **WHEN** a verified, previously unknown email completes sign-in
- **THEN** a document keyed by the lowercase email exists with role `reader` and `allowed: true`, and the user receives a session as a reader

#### Scenario: Unverified email
- **WHEN** the token's email is not verified
- **THEN** no document is created and the sign-in is rejected with 401

### Requirement: Sign-in never changes an existing user
Sign-in SHALL NOT overwrite an existing document; it SHALL only record the last sign-in time.

#### Scenario: Revoked user signs in again
- **WHEN** a user whose document has `allowed: false` signs in
- **THEN** the document keeps `allowed: false` and its role, no session is created, and the response is 403

#### Scenario: Concurrent first sign-ins
- **WHEN** two first sign-ins for the same email arrive together
- **THEN** exactly one document is created and neither changes its role

### Requirement: Admins can list users
The system SHALL let an admin list all onboarded users with email, display name, role, access state and last sign-in time.

#### Scenario: Admin lists users
- **WHEN** an admin opens the Access page
- **THEN** every `allowed_emails` document is shown with its resolved role, including legacy documents without a `role`, which show as `admin` when `admin` is true and `reader` otherwise

#### Scenario: Insufficient role
- **WHEN** a signed-in user whose role lacks `cms:write` requests the user list
- **THEN** the response is 403 and no user data is returned

### Requirement: Admins can add, revoke, restore and change roles
The system SHALL let an admin add a user by email, set `allowed` to false (revoke) or true (restore), and set the role to any defined role (`reader`, `user-base`, `user-advanced`, `admin`).

#### Scenario: Add by email
- **WHEN** an admin adds an email that has no document
- **THEN** a document is created with role `reader` and `allowed: true`

#### Scenario: Revoke
- **WHEN** an admin revokes a user
- **THEN** the user's document has `allowed: false` and their next protected request is treated as anonymous

#### Scenario: Change role
- **WHEN** an admin sets a user's role to `user-advanced`
- **THEN** the document's role is `user-advanced` and the user's next request is evaluated with that role

#### Scenario: Invalid role
- **WHEN** a request sets a role that is not defined
- **THEN** the response is 400 and nothing changes

### Requirement: Admins cannot lock themselves or the site out
The system SHALL reject a change that would revoke the acting admin or take their `admin` role away, or that would leave no active admin.

#### Scenario: Self-revoke or self-demote
- **WHEN** an admin revokes their own access or sets their own role to anything but `admin`
- **THEN** the response is 400 with a clear message and the document is unchanged

#### Scenario: Last admin
- **WHEN** a change would remove the only remaining active admin
- **THEN** the response is 400 and the document is unchanged

### Requirement: User management goes through the Next.js server
The browser SHALL call only this site's `/api/admin/` routes with `Authorization: Bearer <Firebase ID token>`, and those routes SHALL reach private Cloud Functions; missing or invalid tokens SHALL be rejected with 401.

#### Scenario: Missing token
- **WHEN** a request to the users route has no bearer token
- **THEN** the response is 401 with `Cache-Control: no-store`
