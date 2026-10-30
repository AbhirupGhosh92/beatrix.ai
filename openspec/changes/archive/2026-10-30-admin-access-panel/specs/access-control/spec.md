# Spec Delta

## MODIFIED Requirements

### Requirement: Server-verified session
After a successful Google sign-in of a user whose email is verified and who is not revoked, the site SHALL establish a session that the server can verify on every request, and SHALL end it on sign-out. A verified email with no `allowed_emails/{email}` entry SHALL be registered as a `reader` and signed in. The session credential SHALL NOT be readable by page scripts.

#### Scenario: Sign in
- **WHEN** a user who is not revoked completes Google sign-in
- **THEN** the browser receives an `httpOnly`, `Secure` (outside local development) session cookie and the user is treated as logged in by the server

#### Scenario: Sign out
- **WHEN** the user signs out
- **THEN** the session cookie is cleared and the next request is treated as anonymous

#### Scenario: First sign-in of an unknown email
- **WHEN** a Google account with a verified email and no `allowed_emails/{email}` entry signs in
- **THEN** an entry with role `reader` is created and the user receives a session as a reader

#### Scenario: Not allow-listed
- **WHEN** a Google account whose `allowed_emails/{email}` entry has `allowed: false` (revoked) tries to sign in
- **THEN** no session is created and the user stays anonymous
