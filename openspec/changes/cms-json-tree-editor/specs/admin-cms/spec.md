## ADDED Requirements

### Requirement: JSON editor has an editable tree view
The shared JSON editor SHALL offer a Tree view next to its Code view in which every key and value is an input, nested as in the document. Each row SHALL show the value's type (string, number, boolean, null, map or array), let the user change the key and the value, and let the user change the type.

#### Scenario: Edit a value
- **WHEN** a user changes a string value in the Tree view
- **THEN** the JSON text held by the page contains the new value and nothing else changed

#### Scenario: Change a type
- **WHEN** a user changes a row's type from string to number and enters 12
- **THEN** the JSON holds the number 12, not the text "12"

#### Scenario: Read-only editor
- **WHEN** the editor is read-only
- **THEN** the Tree view does not allow any edit

### Requirement: Tree edits add, remove and reorder entries
In the Tree view the user SHALL be able to add an entry to a map or an array, remove any entry, and move array items up and down. Key order in maps SHALL be preserved.

#### Scenario: Add and remove
- **WHEN** a user adds a key to a map and removes another
- **THEN** the JSON text has the new key and lacks the removed one, with the other keys in their previous order

#### Scenario: Reorder an array
- **WHEN** a user moves the second item of an array up
- **THEN** that item is first in the array in the JSON text

### Requirement: Tree and Code views share one document
Both views SHALL edit the same JSON text. Switching between them SHALL keep the content, and any edit SHALL count as an unsaved change exactly as an edit in the Code view does.

#### Scenario: Switch after an edit
- **WHEN** a user edits a value in Tree and switches to Code
- **THEN** the Code view shows the edited document and the page reports unsaved changes

#### Scenario: Tree view and full screen
- **WHEN** a user enters full screen from the Tree view
- **THEN** the Tree view stays selected with the same content

### Requirement: Tree view refuses invalid input
The Tree view SHALL not apply a key that already exists in the same map, and SHALL not render while the text is not valid JSON.

#### Scenario: Duplicate key
- **WHEN** a user renames a key to one that already exists in the same map
- **THEN** an inline error is shown and the JSON text is not changed

#### Scenario: Invalid JSON text
- **WHEN** the text has a syntax error and the user opens the Tree view
- **THEN** a message asks them to fix the syntax in the Code view and no tree is shown

### Requirement: CMS editor opens on the tree
The CMS editor SHALL open a file on the Tree view when its content is valid JSON and on the Code view when it is not.

#### Scenario: Valid file
- **WHEN** an admin opens `profile.json`
- **THEN** the Tree view is shown and the admin can switch to Code

#### Scenario: Invalid file
- **WHEN** an admin opens a file whose stored content has a syntax error
- **THEN** the Code view is shown with the syntax error banner
