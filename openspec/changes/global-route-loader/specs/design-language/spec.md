## ADDED Requirements

### Requirement: Navigation loading indicator
While the app navigates to another page and the destination is still being rendered by the server, a thin progress bar fixed to the top of the page SHALL animate, using the same placement and color as the scroll progress indicator. It SHALL be available on every page, SHALL finish and fade out when the destination is shown, and SHALL NOT remain visible after a navigation that fails or is replaced by another one. At most one such bar SHALL be visible at a time.

#### Scenario: Slow navigation
- **WHEN** the visitor follows a link to another page and the server takes noticeable time to render it
- **THEN** the bar animates from the start of the navigation until the destination is shown, then completes and fades out

#### Scenario: Back and forward
- **WHEN** the visitor uses the browser back or forward buttons to another page
- **THEN** the bar behaves as for a followed link

#### Scenario: Instant navigation
- **WHEN** the destination is shown almost immediately
- **THEN** no bar is shown

#### Scenario: Leaving the home page
- **WHEN** the visitor navigates away from the home page
- **THEN** the scroll progress indicator is replaced by the loading bar and only one bar is visible

#### Scenario: Navigation that does not complete
- **WHEN** a navigation fails, is interrupted by another navigation, or never finishes
- **THEN** the bar does not stay on screen indefinitely

#### Scenario: Navigation that does not leave the page
- **WHEN** the visitor opens a link that does not change the page (same address, new tab, download or another site)
- **THEN** no bar is shown

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion
- **THEN** the navigation loading bar is not shown
