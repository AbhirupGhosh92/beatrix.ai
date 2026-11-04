# profile-content Specification

## Purpose
All copy, labels, metrics and links of the landing page come from one JSON profile, so content changes never require code changes.

## Requirements

### Requirement: Content comes from the stored profile
The page SHALL render its text, labels, metrics and links from the profile JSON and SHALL NOT hardcode them in components.

#### Scenario: Profile edited
- **WHEN** the stored profile JSON is changed
- **THEN** the rendered page reflects the change without a code change or rebuild

### Requirement: Profile is fetched per request through the server
The root layout SHALL load the profile on the server per request via `getProfile()`, and components SHALL read it through `useProfile()`. Client code SHALL NOT import `profile.json` directly.

#### Scenario: Browser never contacts backend functions
- **WHEN** a visitor loads the page
- **THEN** only the Next.js server calls the private Cloud Function, and the browser receives rendered content

### Requirement: Missing keys fall back to the example profile
`getProfile()` SHALL fill any key absent from the stored file from `profile.example.json`, and SHALL fall back to `src/data/profile.json` in development and then to the example profile when no stored file is available.

#### Scenario: New field added to the type
- **WHEN** a field exists in `profile.example.json` but not in the stored profile
- **THEN** the page renders the example value for that field

### Requirement: Personal data stays private
The real profile, resume file and avatar SHALL be git-ignored, and the phone number SHALL NOT be published.

#### Scenario: Fresh clone
- **WHEN** the repository is cloned without private files
- **THEN** the site still builds and renders using the example profile

### Requirement: Menu items are structured and switchable
Each drawer menu item SHALL be an entry in the profile with a label, a link target, an icon and an `enabled` flag, and the drawer SHALL render only enabled items the user's role may use. Items from an older profile that are plain strings SHALL be read as disabled entries.

#### Scenario: Item turned off
- **WHEN** an item's `enabled` is set to false in the stored profile
- **THEN** the drawer no longer shows it and its route is closed

#### Scenario: Old string items
- **WHEN** the stored profile still lists menu items as plain strings
- **THEN** they load without error and stay hidden until converted

#### Scenario: Missing flag
- **WHEN** an item has no `enabled` value
- **THEN** it is treated as disabled

### Requirement: No menu without visible entries
The menu button and the drawer SHALL be shown only when the drawer would list at least one entry for the signed-in user, counting the admin link for roles holding `cms:write`. The top bar itself SHALL stay.

#### Scenario: Nothing to show
- **WHEN** a signed-in user has no enabled entry they may use and is not an admin
- **THEN** the menu button and the drawer are not rendered

#### Scenario: Admin
- **WHEN** an admin is signed in and no menu item is enabled
- **THEN** the menu still opens and lists the admin link

#### Scenario: Entry enabled
- **WHEN** an entry the user may use is enabled
- **THEN** the menu button and the drawer appear

#### Scenario: Anonymous
- **WHEN** nobody is signed in
- **THEN** there is no menu button or drawer, and the brand and theme toggle remain

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
