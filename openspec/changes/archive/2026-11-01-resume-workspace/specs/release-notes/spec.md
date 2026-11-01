## MODIFIED Requirements

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
