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
