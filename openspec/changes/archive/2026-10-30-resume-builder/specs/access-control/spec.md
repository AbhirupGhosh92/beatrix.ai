# Spec Delta

## ADDED Requirements

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
