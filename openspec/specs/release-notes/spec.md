# release-notes Specification

## Purpose
Defines how a release branch produces a GitHub release and how the app shows the latest version and its notes.

## Requirements

### Requirement: Release branch publishes a GitHub release
A successful prod run SHALL cut the release for its `version`, only after the prod stages and the smoke test succeeded: the branch `release/<version>` and the tag `v<version>` at the deployed commit, and a GitHub release marked Latest whose body is `RELEASE_NOTES.md` at that commit. Pushing a release branch SHALL NOT publish a release.

#### Scenario: Release branch pushed
- **WHEN** a prod run for version `1.2.1` succeeds on a commit whose `RELEASE_NOTES.md` is non-empty
- **THEN** the branch `release/1.2.1` exists at that commit, and a release `v1.2.1` marked Latest exists with those notes as its body

#### Scenario: Prod run fails
- **WHEN** a prod run fails before or at the smoke test
- **THEN** no branch, tag or release is created or updated

#### Scenario: Notes missing
- **WHEN** a prod run starts and the commit has no `RELEASE_NOTES.md` or it is empty
- **THEN** the run fails before any plan and no release is cut

#### Scenario: Branch exists at another commit
- **WHEN** `release/1.2.1` or the tag `v1.2.1` already exists at a different commit
- **THEN** the run fails before any plan and nothing is changed

#### Scenario: Re-run for the same commit
- **WHEN** a prod run for the same commit and version runs again
- **THEN** the existing release is updated and no second branch, tag or release is created

#### Scenario: Push without deploy
- **WHEN** a release branch is pushed and no prod run is started
- **THEN** no release is created

### Requirement: Latest version shown at the bottom of the page
The home page SHALL show the latest GitHub release version in the very last element on the page, to every visitor including anonymous ones. No other page SHALL show the version button.

#### Scenario: Release exists
- **WHEN** a visitor scrolls to the bottom of the page
- **THEN** the latest version, for example `v1.2.1`, is shown as a button

#### Scenario: No release or GitHub unreachable
- **WHEN** no release exists or it cannot be read
- **THEN** the version button is not rendered and the rest of the page is unchanged

#### Scenario: Other pages
- **WHEN** a visitor opens any page other than the home page, such as the resume builder, the job tracker or the admin pages
- **THEN** no version button is shown

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
