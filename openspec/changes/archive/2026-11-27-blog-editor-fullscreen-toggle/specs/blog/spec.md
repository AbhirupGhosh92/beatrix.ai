## ADDED Requirements

### Requirement: Full-screen editor
The editor toolbar SHALL include a full-screen button that expands the editor and its toolbar to cover the whole viewport, and the same button or Escape SHALL return to the normal view. The button SHALL show its state, have an accessible name, and work by keyboard and touch. The choice SHALL NOT be stored with the post, and switching SHALL keep the text, selection, undo history and unsaved changes.

#### Scenario: Enter full screen
- **WHEN** an author presses the full-screen button
- **THEN** the editor and its toolbar cover the whole screen, the text keeps its cursor and content, and the button shows as on

#### Scenario: Leave full screen
- **WHEN** an author presses the button again or presses Escape while no toolbar panel is open
- **THEN** the editor returns to its normal place in the page with the same text and cursor

#### Scenario: Long post in full screen
- **WHEN** a long post is open in full screen and the author scrolls
- **THEN** the toolbar stays visible, the text area fills the remaining height and scrolls inside itself, and the page behind does not move

#### Scenario: Narrow screen
- **WHEN** full screen is used at 375px wide
- **THEN** the toolbar and text area fit the screen without horizontal scroll

#### Scenario: Unsaved text survives
- **WHEN** an author types text, enters full screen, leaves it and saves
- **THEN** the typed text is saved and nothing about full screen is stored in the post
