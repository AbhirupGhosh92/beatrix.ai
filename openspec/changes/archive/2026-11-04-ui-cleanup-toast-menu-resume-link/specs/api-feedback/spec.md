# Spec Delta

## MODIFIED Requirements

### Requirement: Snackbar behavior
Snackbars SHALL stack without hiding each other, dismiss on their own after a few seconds and on demand, be announced to assistive technology, animate in when they appear and out when they leave (the remaining snackbars moving smoothly into the freed space), and not animate under reduced motion.

#### Scenario: Several outcomes at once
- **WHEN** two calls finish within the same moment
- **THEN** both snackbars are visible and each dismisses independently

#### Scenario: Screen reader
- **WHEN** a snackbar appears
- **THEN** its text is announced; error snackbars are announced assertively

#### Scenario: Smooth exit
- **WHEN** a snackbar times out or the user dismisses it
- **THEN** it fades and moves out before it is removed, and the snackbars below it slide up instead of jumping

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** snackbars appear and disappear without animation
