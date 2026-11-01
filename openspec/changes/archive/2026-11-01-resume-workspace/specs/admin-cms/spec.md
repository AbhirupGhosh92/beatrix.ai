## ADDED Requirements

### Requirement: JSON editor has a full screen view
The JSON editor component SHALL offer a full screen view that fills the window, keeps the current content and the chosen code or tree view, can be left with a button or Escape, and prevents the page behind it from scrolling. It SHALL be available everywhere the component is used: the CMS editor, the resume structure editor and the job tracker's tailor JSON.

#### Scenario: Enter and leave
- **WHEN** a user presses Full screen on a JSON editor and then presses Escape
- **THEN** the editor fills the window, then returns to its place with the same content

#### Scenario: Edits carry over
- **WHEN** a user changes the JSON in full screen and exits
- **THEN** the edited text is what the form or page now holds

#### Scenario: Inside a form
- **WHEN** the editor is inside a form and the user presses Full screen or Exit full screen
- **THEN** the form is not submitted

#### Scenario: Inside a dialog
- **WHEN** the editor is inside a modal dialog and is shown full screen
- **THEN** it still covers the whole window above the dialog
