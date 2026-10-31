## ADDED Requirements

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
