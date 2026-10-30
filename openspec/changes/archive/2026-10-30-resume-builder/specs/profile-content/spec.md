# Spec Delta

## ADDED Requirements

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
