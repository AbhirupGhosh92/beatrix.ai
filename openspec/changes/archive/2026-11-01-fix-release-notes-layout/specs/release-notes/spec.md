# Spec Delta

## ADDED Requirements

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
