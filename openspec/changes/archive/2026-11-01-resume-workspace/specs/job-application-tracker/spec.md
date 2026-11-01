## ADDED Requirements

### Requirement: Tailor JSON uses the shared JSON editor
The application form SHALL edit the tailor JSON in the same JSON editor component as the CMS editor and SHALL NOT use a plain text area. Validation and storage of the tailor JSON SHALL be unchanged, including accepting a summary written either as a single object or as a list of variants.

#### Scenario: Edit the tailor JSON
- **WHEN** a user opens an application that has a tailor JSON
- **THEN** it is shown in the shared JSON editor and can be changed there

#### Scenario: Invalid tailor JSON
- **WHEN** a user saves text that is not valid JSON or does not fit the structure
- **THEN** the save is rejected with the reasons and the stored tailor JSON is unchanged

#### Scenario: Older summary shape
- **WHEN** a tailor JSON written before summary variants is saved or used to create a resume
- **THEN** it is accepted and the summary becomes the single active variant
