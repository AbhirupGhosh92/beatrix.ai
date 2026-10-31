## REMOVED Requirements

### Requirement: Template preview with sample data
**Reason**: The preview no longer shows sample content only. It renders the open resume's own data live, with the sample values as the default for empty fields, so the rule that it never contains the user's resume is reversed (issue #85).
**Migration**: Replaced by "Live template preview" and "Preview rendering" below, which keep the same-renderer, template-switching, Markdown and no-inline-viewer behavior.

## ADDED Requirements

### Requirement: Live template preview
When a user picks a template for PDF or DOCX, the builder SHALL show a preview filled with the open resume's own content, taken from the same data the form edits and autosave stores, and SHALL update it shortly after each edit. A field or repeatable section the user has not filled in SHALL show its sample value, and the preview SHALL say that sample text is shown for fields not yet filled in.

#### Scenario: Picking a template
- **WHEN** a user selects the Modern template on a new, empty resume
- **THEN** a preview of the Modern design appears with sample names, jobs and skills

#### Scenario: Typing updates the preview
- **WHEN** the user types their name into the name field
- **THEN** within about a second the preview shows that name in place of the sample name, without saving or reloading

#### Scenario: Partly filled resume
- **WHEN** the user has filled the contact section but not the experience section
- **THEN** the preview shows their contact details and the sample experience entries

#### Scenario: Clearing a field
- **WHEN** the user empties a field they had filled
- **THEN** the preview shows the sample value for that field again

#### Scenario: Same data as the form
- **WHEN** an advanced user's edit is autosaved
- **THEN** the preview shows exactly the data that was saved, and a base user's unsaved edit also appears in the preview

#### Scenario: Sample text never generated
- **WHEN** the user leaves a required field empty and presses Generate
- **THEN** generation is refused as before and no file contains sample text

### Requirement: Preview rendering
The preview SHALL be produced by the same renderer as the PDF download, SHALL update when another template is picked and SHALL NOT be shown for Markdown. A browser that cannot show PDFs inline SHALL offer to open the preview instead.

#### Scenario: Switching template
- **WHEN** the user selects a different template
- **THEN** the preview changes to that template's style and layout

#### Scenario: Markdown
- **WHEN** the format is Markdown
- **THEN** no preview is shown

#### Scenario: No inline PDF viewer
- **WHEN** the browser cannot display PDFs inline
- **THEN** an "open preview" link is shown instead of an empty frame
