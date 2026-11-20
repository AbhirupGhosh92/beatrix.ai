## ADDED Requirements

### Requirement: Text style options in the editor
The editor's floating toolbar SHALL offer underline, strikethrough, inline code and clear formatting in addition to its existing controls, and SHALL show each style as active while the selection has it. A code block SHALL be offered from the floating toolbar and from the insert menu. These controls SHALL be usable by keyboard and by touch, SHALL use only formats the post document already stores, and SHALL NOT change how earlier posts open or render.

#### Scenario: Apply a style to a selection
- **WHEN** an author selects text and chooses strikethrough, underline or inline code
- **THEN** the selected text shows that style, the control shows as active, and reopening the saved post shows the same style

#### Scenario: Clear formatting
- **WHEN** an author selects formatted text and chooses clear formatting
- **THEN** the text styles (bold, italic, underline, strikethrough, code, link) are removed from the selection and the text stays

#### Scenario: Code block
- **WHEN** an author chooses code block from the floating toolbar on a paragraph, or from the insert menu on an empty line
- **THEN** that block becomes a code block that saves and renders as one

#### Scenario: Keyboard and touch
- **WHEN** an author uses only the keyboard, or a touch screen
- **THEN** every new control can be reached and used, and the toolbar stays on screen at 375px wide

#### Scenario: Earlier posts
- **WHEN** an author opens a post written before this change
- **THEN** it opens and renders without loss
