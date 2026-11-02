# api-feedback Specification

## Purpose
Defines the visual feedback every API response must give the user: snackbars for outcomes, inline error states with retry, and skeletons while data loads.

## Requirements

### Requirement: Success snackbar for mutations
Every successful create, update, delete or action call to `/api/*` SHALL show a success snackbar naming what happened.

#### Scenario: Application created
- **WHEN** a user saves a new job application and the call succeeds
- **THEN** a success snackbar confirms it and the list shows the new row

#### Scenario: Autosave does not nag
- **WHEN** a resume autosaves successfully
- **THEN** the sync indicator updates and no success snackbar is shown

### Requirement: Error snackbar for failures
Every failed call to `/api/*` SHALL show an error snackbar with the server's message, or a generic message when none was returned, including when the network is unreachable.

#### Scenario: Server rejects a request
- **WHEN** a call returns a non-success status with an error message
- **THEN** an error snackbar shows that message

#### Scenario: Network failure
- **WHEN** the browser cannot reach the site
- **THEN** an error snackbar shows a generic failure message

### Requirement: Snackbar behavior
Snackbars SHALL stack without hiding each other, dismiss on their own after a few seconds and on demand, be announced to assistive technology, and not animate under reduced motion.

#### Scenario: Several outcomes at once
- **WHEN** two calls finish within the same moment
- **THEN** both snackbars are visible and each dismisses independently

#### Scenario: Screen reader
- **WHEN** a snackbar appears
- **THEN** its text is announced; error snackbars are announced assertively

### Requirement: Inline error state with retry
When a page cannot render because its data failed to load, it SHALL show an inline error state with a retry action in addition to the error snackbar.

#### Scenario: Tracker list fails
- **WHEN** loading the job applications fails
- **THEN** the page shows an error message and a Retry button, and selecting Retry reloads the list

### Requirement: Skeleton loading
Full-page and list loading SHALL show skeleton placeholders shaped like the content, not a spinner, and SHALL keep the layout from shifting when data arrives.

#### Scenario: Resume list loading
- **WHEN** the resume list is loading
- **THEN** skeleton rows are shown until the list arrives

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** skeletons are shown without animation

### Requirement: Action buttons show progress
A control that triggers a call SHALL be disabled while the call is in flight, so a request cannot be sent twice.

#### Scenario: Double click
- **WHEN** a user clicks Save twice quickly
- **THEN** only one request is sent
