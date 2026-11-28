## ADDED Requirements

### Requirement: Full-screen editor
The editor toolbar SHALL include a full-screen button that expands the editor, with its toolbar, to cover the whole viewport, and a way back to the normal view by the same button or the Escape key. While in full screen the toolbar SHALL stay visible, the text area SHALL fill the remaining height and scroll within itself, and the page behind SHALL not scroll. Switching in either direction SHALL keep the text, selection, undo history and unsaved changes. The button SHALL show whether full screen is on, have an accessible name, and work by keyboard and touch. The choice SHALL NOT be stored with the post.

#### Scenario: Enter full screen
- **WHEN** an author presses the full-screen button
- **THEN** the editor and its toolbar cover the whole screen, the text keeps its cursor and content, and the button shows as on

#### Scenario: Leave full screen
- **WHEN** an author presses the button again or presses Escape while no toolbar panel is open
- **THEN** the editor returns to its normal place in the page with the same text and cursor

#### Scenario: Long post in full screen
- **WHEN** a long post is open in full screen and the author scrolls
- **THEN** the text scrolls inside the editor while the toolbar stays on top, and the page behind does not move

#### Scenario: Narrow screen
- **WHEN** full screen is used at 375px wide
- **THEN** the toolbar and text area fit the screen without horizontal scroll

#### Scenario: Unsaved text survives
- **WHEN** an author types text, enters full screen, leaves it and saves
- **THEN** the typed text is saved and nothing about full screen is stored in the post
