## ADDED Requirements

### Requirement: PR evidence
Before opening a PR the Product Owner SHALL capture evidence of the change and fill the PR's "Screenshots / recordings" section with it. For a user-visible change the section SHALL embed screenshots in the light and dark themes at a narrow and a desktop width, each viewed before it is attached, committed under `docs/pr-assets/<issue-id>/` on the feature branch and linked by commit SHA, together with relevant text evidence. For a non-visual change the section SHALL carry other relevant evidence (logs, command output, scenario results) and say why no screenshot applies. The section SHALL state what could not be captured and SHALL NOT be "n/a" for a user-visible change.

#### Scenario: Visible change
- **WHEN** a PR is opened for a user-visible change
- **THEN** its description embeds screenshots in both themes at a narrow and a desktop width, linked by commit SHA to files under `docs/pr-assets/<issue-id>/`

#### Scenario: Non-visual change
- **WHEN** a PR is opened for a change with nothing to see, such as infrastructure or a pipeline change
- **THEN** its description carries other relevant evidence and states why no screenshot applies

#### Scenario: Evidence that cannot be captured
- **WHEN** a viewport or state cannot be captured, such as a width below the headless browser's minimum
- **THEN** the description says so and gives the measured result instead
