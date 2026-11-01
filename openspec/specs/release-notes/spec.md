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

### Requirement: Version stays visible beside the back-to-top button
The version button SHALL remain fully visible and clickable when the page is scrolled to the bottom, including while the back-to-top button is showing, at every viewport width.

#### Scenario: Scrolled to the bottom
- **WHEN** a visitor scrolls to the bottom of the page and the back-to-top button appears
- **THEN** the version button does not overlap the back-to-top button and a click on the version opens the modal

### Requirement: Release notes modal is readable and evenly padded
The release notes modal SHALL show its title and notes in the normal page text colour with sufficient contrast in both the light and the dark theme, with equal padding on all sides and the close control in the top-right corner without adding a row above the title.

#### Scenario: Light theme
- **WHEN** a visitor opens the modal in the light theme
- **THEN** the title and every note line are clearly readable against the modal background

#### Scenario: Dark theme
- **WHEN** a visitor opens the modal in the dark theme
- **THEN** the title and notes remain clearly readable

#### Scenario: Close control placement
- **WHEN** the modal is open
- **THEN** the title starts at the top padding of the box, the close button is in the top-right corner, and no extra "close" text is visible on screen
