## ADDED Requirements

### Requirement: Fixed editor toolbar
The post editor SHALL present the body as an editor card with one toolbar above the text that is always visible while editing and stays in view when the page scrolls. On narrow screens the toolbar SHALL wrap onto several rows instead of causing horizontal page scroll.

#### Scenario: Toolbar always visible
- **WHEN** an author opens a post in the editor without selecting anything
- **THEN** the toolbar is shown above the text with its controls, and it stays visible while the author scrolls a long post

#### Scenario: Narrow screen
- **WHEN** the editor is used at 375px wide
- **THEN** every toolbar control is reachable and the page does not scroll sideways

### Requirement: Toolbar text controls
The toolbar SHALL offer undo, redo, bold, italic, underline, strikethrough, inline code, clear formatting, highlight, text color, subscript, superscript, link and alignment. Each control SHALL show when it is active, be disabled when it does not apply, have an accessible name, and work by keyboard and touch.

#### Scenario: Apply a format
- **WHEN** an author selects text and presses bold or chooses a color
- **THEN** the text is formatted, the control shows as active, and reopening the saved post shows the same format

### Requirement: Toolbar block and insert controls
The toolbar SHALL offer paragraph and heading 1 to 3, bulleted, numbered and task lists with their list styles, block quote, code block, horizontal rule, image (upload or URL) and a table with its row, column, merge, split and delete commands, with the same active, disabled, accessible-name, keyboard and touch behavior as the text controls.

#### Scenario: Insert a block
- **WHEN** an author chooses a heading, a list or a table from the toolbar
- **THEN** the block is inserted or applied at the cursor and reopening the saved post shows it

#### Scenario: Table commands
- **WHEN** the cursor is outside a table
- **THEN** the table row, column, merge and split controls are disabled, and inside a table they are enabled

#### Scenario: Keyboard
- **WHEN** an author uses only the keyboard
- **THEN** focus can enter the toolbar, move between its controls and return to the text

## MODIFIED Requirements

### Requirement: Distraction-free editor canvas
The post editor SHALL present a large title field above the editor card described by the fixed toolbar requirement. Every format and limit the editor supported before SHALL remain available and enforced.

#### Scenario: Floating toolbar on selection
- **WHEN** an author selects text in the editor
- **THEN** the fixed toolbar shows the formats of the selection as active, and applying one formats the selected text

#### Scenario: Keyboard and touch
- **WHEN** an author uses only the keyboard, or a touch screen
- **THEN** the toolbar can be reached and used

#### Scenario: Existing content and limits
- **WHEN** an author opens a post written before this change
- **THEN** it opens without loss, and character and image limits are still enforced

### Requirement: Text style options in the editor
The editor's toolbar SHALL offer underline, strikethrough, inline code and clear formatting and SHALL show each style as active while the selection has it. A code block SHALL be offered from the toolbar. These controls SHALL be usable by keyboard and by touch, SHALL use only formats the post document already stores, and SHALL NOT change how earlier posts open or render.

#### Scenario: Apply a style to a selection
- **WHEN** an author selects text and chooses strikethrough, underline or inline code
- **THEN** the selected text shows that style, the control shows as active, and reopening the saved post shows the same style

#### Scenario: Clear formatting
- **WHEN** an author selects formatted text and chooses clear formatting
- **THEN** the text styles (bold, italic, underline, strikethrough, code, link) are removed from the selection and the text stays

#### Scenario: Code block
- **WHEN** an author chooses code block from the toolbar on a paragraph
- **THEN** that block becomes a code block that saves and renders as one

#### Scenario: Keyboard and touch
- **WHEN** an author uses only the keyboard, or a touch screen
- **THEN** every control can be reached and used, and the toolbar stays on screen at 375px wide

#### Scenario: Earlier posts
- **WHEN** an author opens a post written before this change
- **THEN** it opens and renders without loss

## REMOVED Requirements

### Requirement: Insert menu
**Reason**: The "+" insert menu on an empty line is replaced by the always-visible toolbar, which offers the same insert controls (image, horizontal rule, list, block quote) and more.
**Migration**: Use the toolbar buttons; nothing stored changes.
