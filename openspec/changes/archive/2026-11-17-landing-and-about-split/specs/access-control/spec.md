# Spec Delta

## MODIFIED Requirements

### Requirement: Default-deny route gating
Every route SHALL require a valid session except `/`, `/about` and static assets. A request without a valid session SHALL be redirected to `/` for pages and answered with 401 for `/api/*`. A route that is not listed as public MUST therefore be protected.

#### Scenario: Anonymous page request
- **WHEN** a request without a valid session asks for `/admin`, or any path other than `/` or `/about`
- **THEN** the response is a redirect to `/` and no page content is served

#### Scenario: Anonymous API request
- **WHEN** a request without a valid session asks for any `/api/*` route that is not public
- **THEN** the response is 401 with `Cache-Control: no-store`

#### Scenario: Landing page stays public
- **WHEN** an anonymous visitor requests `/`
- **THEN** the page is served normally

#### Scenario: About page is public
- **WHEN** an anonymous visitor requests `/about`
- **THEN** the page is served normally

#### Scenario: Expired or tampered session
- **WHEN** the session cookie is expired, revoked or invalid
- **THEN** the request is treated as anonymous and the cookie is cleared
