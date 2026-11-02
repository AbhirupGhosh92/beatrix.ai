# Spec Delta

## Purpose

Defines which browser-side application state lives in a single Redux store, how server data reaches it, and which state deliberately stays outside it.

## ADDED Requirements

### Requirement: Single store for shared state
The browser SHALL keep session and role, drawer visibility, the resume workspace, the job tracker data and view, the admin lists and notifications in one Redux store provided at the root of the app.

#### Scenario: Components read shared state from the store
- **WHEN** two components on a page need the same shared value, such as the signed-in role
- **THEN** both read it from the store and neither keeps its own copy

#### Scenario: Role change after sign-in
- **WHEN** the session check completes for a signed-in user
- **THEN** the role is stored once and the drawer, navbar and admin link all reflect it

### Requirement: Server data fetched and cached through one layer
Every call from the browser to the site's `/api/*` routes SHALL go through one data layer that tracks loading, success and error for each request and keeps the returned data in the store.

#### Scenario: Revisiting a page
- **WHEN** a user leaves a list page and returns to it
- **THEN** the cached list is shown immediately while it refreshes

#### Scenario: Mutation refreshes the list
- **WHEN** a create, update or delete call succeeds
- **THEN** the affected list shows the new data without a manual reload

#### Scenario: Error status stays observable
- **WHEN** a save is rejected with 409 because the stored resume changed
- **THEN** the resume workspace can tell it apart from other failures and handle it as it does today

### Requirement: Ephemeral state and theme stay out of the store
Purely visual or measured state, and the theme, SHALL NOT be held in the store.

#### Scenario: Theme unchanged
- **WHEN** a page loads in either theme or the OS preference is dark
- **THEN** the theme is applied before first paint with no flash and no hydration warning, as before

#### Scenario: Hover and measurement state
- **WHEN** a user hovers a card or the tabs pill is measured
- **THEN** no store update occurs

### Requirement: Behavior preserved
Moving state into the store SHALL NOT change what a user can do or see, except for the feedback defined by `api-feedback`, and SHALL NOT change access control.

#### Scenario: Resume autosave
- **WHEN** a user with `features:advanced` edits a resume
- **THEN** it autosaves with the same timing, conflict handling and dirty indication as before

#### Scenario: Anonymous visitor
- **WHEN** no session exists
- **THEN** the page shows no drawer or menu button and makes no authenticated calls beyond the session check
