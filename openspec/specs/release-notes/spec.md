# release-notes Specification

## Purpose
Defines how a release branch produces a GitHub release and how the app shows the latest version and its notes.

## Requirements

### Requirement: Release branch publishes a GitHub release
Pushing a branch named `release/<major.minor[.patch]>` SHALL create the tag `v<version>` and a GitHub release marked Latest whose body is the branch's `RELEASE_NOTES.md`, and SHALL fail without publishing when that file is missing or empty.

#### Scenario: Release branch pushed
- **WHEN** `release/1.2.1` is pushed with a non-empty `RELEASE_NOTES.md`
- **THEN** a release `v1.2.1` marked Latest exists with those notes as its body

#### Scenario: Notes missing
- **WHEN** a release branch is pushed without `RELEASE_NOTES.md`
- **THEN** the workflow fails and no release is created

### Requirement: Latest version shown at the bottom of the page
The page SHALL show the latest GitHub release version in the very last element on the page, to every visitor including anonymous ones.

#### Scenario: Release exists
- **WHEN** a visitor scrolls to the bottom of the page
- **THEN** the latest version, for example `v1.2.1`, is shown as a button

#### Scenario: No release or GitHub unreachable
- **WHEN** no release exists or it cannot be read
- **THEN** the version button is not rendered and the rest of the page is unchanged

### Requirement: Release notes modal
Clicking the version SHALL open a modal with the release name and its notes as plain text, closable by a button, the backdrop or Escape.

#### Scenario: Open and close
- **WHEN** a visitor clicks the version and then presses Escape
- **THEN** the notes are shown and then the modal closes
