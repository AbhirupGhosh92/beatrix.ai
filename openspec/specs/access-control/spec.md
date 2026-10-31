# access-control Specification

## Purpose
Decide who may reach which route and use which feature: server-verified sessions, a role hierarchy, a single permission policy and default-deny route gating, so access never depends on client-side checks.

## Requirements

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

### Requirement: Default-deny route gating
Every route SHALL require a valid session except `/` and static assets. A request without a valid session SHALL be redirected to `/` for pages and answered with 401 for `/api/*`. A route that is not listed as public MUST therefore be protected.

#### Scenario: Anonymous page request
- **WHEN** a request without a valid session asks for `/admin`, or any path other than `/`
- **THEN** the response is a redirect to `/` and no page content is served

#### Scenario: Anonymous API request
- **WHEN** a request without a valid session asks for any `/api/*` route that is not public
- **THEN** the response is 401 with `Cache-Control: no-store`

#### Scenario: Landing page stays public
- **WHEN** an anonymous visitor requests `/`
- **THEN** the page is served normally

#### Scenario: Expired or tampered session
- **WHEN** the session cookie is expired, revoked or invalid
- **THEN** the request is treated as anonymous and the cookie is cleared

### Requirement: Role hierarchy
The system SHALL define the roles `reader`, `user-base`, `user-advanced` and `admin`, plus the unauthenticated state `anonymous`. Each role SHALL include every permission of the roles below it: `anonymous` < `reader` < `user-base` < `user-advanced` < `admin`.

#### Scenario: Higher role inherits
- **WHEN** a user has the role `user-advanced`
- **THEN** they hold every permission of `user-base` and `reader`

#### Scenario: Reader is view-only
- **WHEN** a user has the role `reader`
- **THEN** they can view the site but hold no feature permission and no write permission, and cannot access the admin panel

### Requirement: Single permission policy
Access SHALL be decided from one policy that maps each role to permissions and each protected route to the permission it requires. The route gate, API routes, Cloud Functions and UI SHALL all use that policy, and a permission check on the server SHALL be authoritative over what the UI shows.

#### Scenario: Insufficient permission
- **WHEN** a signed-in user requests a route that requires a permission their role lacks
- **THEN** the response is 403 for `/api/*` and a redirect to `/` for pages, and nothing protected is returned

#### Scenario: Admin has full access
- **WHEN** a user has the role `admin`
- **THEN** every route and permission is allowed

#### Scenario: UI follows the policy
- **WHEN** a user lacks a permission
- **THEN** navigation entries and controls that need it are not shown

### Requirement: Role assignment and defaults
A user's role SHALL be read from their `allowed_emails/{email}` entry. An entry without a role SHALL be treated as `reader`. A legacy entry with `admin: true` and no role SHALL be treated as `admin`. Only an administrator can promote a user.

#### Scenario: No role set
- **WHEN** an allow-listed user's entry has no `role`
- **THEN** they are a `reader`

#### Scenario: Legacy admin
- **WHEN** an entry has `admin: true` and no `role`
- **THEN** the user is an `admin`

#### Scenario: Unknown role value
- **WHEN** an entry's `role` is not one of the defined roles
- **THEN** the user is treated as `reader`

### Requirement: Role changes take effect immediately
The role and allow-list state SHALL be re-read on every protected request, so a promotion, demotion or revocation applies to the user's next request without signing in again.

#### Scenario: Demotion
- **WHEN** an admin is changed to `reader` while signed in
- **THEN** their next request to `/admin` is denied

#### Scenario: Revocation
- **WHEN** an entry is set to `allowed: false` while its user is signed in
- **THEN** their next protected request is treated as anonymous

### Requirement: Feature routes can be switched off from config
A route that belongs to a menu item SHALL be served only while that item is enabled in the main config. When it is disabled, the route and its API SHALL answer 404 for every role, including admin. If the config cannot be read, the route SHALL stay closed.

#### Scenario: Disabled item
- **WHEN** a menu item is disabled and an authorized user requests its page or API
- **THEN** the response is 404 and nothing of the feature is served

#### Scenario: Config unavailable
- **WHEN** the config cannot be loaded and no cached copy exists
- **THEN** the feature route answers 404 rather than opening

#### Scenario: Flag does not grant access
- **WHEN** an item is enabled but the user's role lacks the route's permission
- **THEN** the normal 403 or redirect applies

### Requirement: Resume routes need basic feature access
`/resume-builder` and `/api/resumes` SHALL require the `features:basic` permission, and `/api/admin/resumes` SHALL require `cms:write`.

#### Scenario: Reader requests the builder
- **WHEN** a `reader` requests `/resume-builder`
- **THEN** the response is a redirect to `/`

#### Scenario: Reader calls the API
- **WHEN** a `reader` calls `/api/resumes`
- **THEN** the response is 403

### Requirement: Job tracker routes need basic feature access
`/job-tracker` and `/api/applications` SHALL require the `features:basic` permission and SHALL be served only while the `job-tracker` menu item is enabled.

#### Scenario: Reader requests the tracker
- **WHEN** a `reader` requests `/job-tracker`
- **THEN** the response is a redirect to `/`

#### Scenario: Reader calls the API
- **WHEN** a `reader` calls `/api/applications`
- **THEN** the response is 403

#### Scenario: Item disabled
- **WHEN** the `job-tracker` item is disabled and a `user-base` user requests `/job-tracker` or `/api/applications`
- **THEN** the response is 404
