# Spec Delta

## ADDED Requirements

### Requirement: Account menu entries are configured in the profile
Each entry of the account menu (the "..." dropdown in the top bar) SHALL be an entry in the profile with an id, a label, an icon, an `enabled` flag and an action, either a link to a path or URL or sign-out. The menu SHALL render only enabled entries, and for a link to an internal path only when the user's role may open that path.

#### Scenario: Link entry
- **WHEN** an enabled entry has the link action with a path
- **THEN** choosing it navigates to that path, and an external URL opens in a new tab without exposing the opener

#### Scenario: Sign-out entry
- **WHEN** the user chooses an enabled entry with the sign-out action
- **THEN** the session ends as it does today

#### Scenario: Entry turned off
- **WHEN** an entry's `enabled` is false or missing in the stored profile
- **THEN** it is not shown

#### Scenario: Entry the role may not open
- **WHEN** an enabled link entry points to a path requiring a permission the role lacks
- **THEN** the entry is not shown

#### Scenario: Older profile shape
- **WHEN** the stored profile lists entries with only a label and an icon
- **THEN** it loads without error, the log-out entry stays a working sign-out, and the other entries stay hidden until given an action and enabled

#### Scenario: Nothing to show
- **WHEN** no entry is visible for the user
- **THEN** the "..." button is not rendered
