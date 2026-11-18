## ADDED Requirements

### Requirement: Editing a key in the Tree view keeps the cursor
While the user types in the key field of a map entry in the JSON editor's Tree view, the field SHALL keep keyboard focus and caret position, and the entry SHALL keep its expanded or collapsed state and its children, for every keystroke that produces a valid key.

#### Scenario: Typing a multi-character key
- **WHEN** the user focuses the key field of a map entry and types several characters in a row without clicking
- **THEN** every character is appended in the same field, the field stays focused, and the document holds the new key after each keystroke

#### Scenario: Renaming an expanded entry
- **WHEN** the user renames the key of an expanded entry that has children
- **THEN** the entry stays expanded and shows the same children under the new key

#### Scenario: Invalid key
- **WHEN** the user types a key that is empty or already exists in the same map
- **THEN** the field shows an inline error and the document does not change
