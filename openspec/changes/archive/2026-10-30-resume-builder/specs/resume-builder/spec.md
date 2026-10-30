# Spec Delta

## Purpose

Lets signed-in users with feature access build resumes from a structured, validated form, export them in several styles and formats from the browser, and keep them privately stored per user.

## ADDED Requirements

### Requirement: Feature is gated by role and by a menu flag
The resume builder page and its API SHALL be available only to users holding `features:basic` (`user-base` and above) and only while its menu item is enabled in the main config. The drawer menu SHALL show the item only when both hold.

#### Scenario: Enabled item for a base user
- **WHEN** a `user-base` user opens the drawer while the item is enabled
- **THEN** the Resume builder entry is shown and opens the builder

#### Scenario: Reader
- **WHEN** a `reader` requests the builder page or its API
- **THEN** the page redirects to `/` and the API answers 403, and the entry is not shown

#### Scenario: Item disabled
- **WHEN** the item's `enabled` flag is false and any user requests the page or API
- **THEN** the response is 404 and the entry is not shown, even for an admin

### Requirement: Structured form from a structure file
The form SHALL be generated from a structure file that defines sections, fields, field types and validation limits. Base users SHALL use the default structure from the resume config and SHALL NOT edit it.

#### Scenario: Base user form
- **WHEN** a base user creates a resume
- **THEN** the form shows exactly the sections and fields of the default structure

#### Scenario: Base user cannot change the structure
- **WHEN** a base user tries to save a resume with a different structure
- **THEN** the save is rejected and the stored resume is unchanged

### Requirement: Placeholders, not sample values
New forms SHALL show example text only as placeholders. Fields SHALL start empty so the user must enter their own content before a resume can be generated.

#### Scenario: Untouched form
- **WHEN** a user opens a new resume and does not edit it
- **THEN** every field is empty with a placeholder, and Generate is refused with the missing required fields listed

### Requirement: Full validation before generation
Every field SHALL be validated against its structure rules (required, type, length, format) as the user edits and again on generate. Generation SHALL be blocked while any field is invalid, and the stored structure and resume data SHALL be validated again on the server on every save.

#### Scenario: Invalid field
- **WHEN** a required field is empty or an email field is malformed
- **THEN** the field shows an error and Generate is disabled

#### Scenario: Server revalidates
- **WHEN** a request saves data that breaks the structure's size or shape limits
- **THEN** the server rejects it with a 400 and stores nothing

### Requirement: Drafts always save
Saving a resume SHALL succeed for incomplete or invalid content as long as it stays within the structure's size and shape limits. Validation SHALL only block generation.

#### Scenario: Save an incomplete draft
- **WHEN** a user saves a resume with empty required fields
- **THEN** the draft is stored and reopened later with the same content

### Requirement: Save mode depends on the role
Base users SHALL save explicitly and be warned about unsaved changes. Advanced users SHALL have changes saved automatically, and an automatic save that is older than the stored version SHALL be rejected instead of overwriting it.

#### Scenario: Base user explicit save
- **WHEN** a base user edits a field and does not press Save
- **THEN** nothing is stored and leaving the page warns about unsaved changes

#### Scenario: Advanced autosave
- **WHEN** an advanced user edits a field
- **THEN** the change is stored shortly afterwards without a button press

#### Scenario: Stale autosave
- **WHEN** a second tab saved a newer version first
- **THEN** the older tab's save is rejected and that tab is told to reload

### Requirement: Resume cap by role
A base user SHALL hold at most the number of resumes set in the resume config (3). An advanced user SHALL have no cap. The cap SHALL hold when requests arrive in parallel.

#### Scenario: Fourth resume for a base user
- **WHEN** a base user with 3 resumes creates another
- **THEN** the request is rejected with a clear message and no resume is added

#### Scenario: Parallel creates
- **WHEN** a base user with 2 resumes sends two create requests at the same time
- **THEN** exactly one succeeds

#### Scenario: Downgrade
- **WHEN** an advanced user with more than 3 resumes becomes a base user
- **THEN** they can still open, edit, export and delete their resumes but cannot create new ones until under the cap

### Requirement: Editable structure for advanced users
An advanced user SHALL be able to edit the structure file of each of their resumes. A structure SHALL be accepted only when it conforms to the structure rules in the resume config (allowed field types, maximum sections, fields and lengths).

#### Scenario: Valid custom structure
- **WHEN** an advanced user adds a section with allowed field types
- **THEN** the form shows the new section and the resume keeps its own structure

#### Scenario: Invalid structure
- **WHEN** the structure uses a disallowed field type or exceeds the limits
- **THEN** it is rejected with the reason and the previous structure stays

### Requirement: Config-driven templates
Templates SHALL be defined in the resume config as an id, a label, an `enabled` flag, a layout id from a fixed set and style values from a fixed vocabulary. Only enabled templates SHALL be offered. A template that is invalid SHALL be skipped without breaking the page.

#### Scenario: Disabled template
- **WHEN** a template's `enabled` is false
- **THEN** it is not offered in the picker

#### Scenario: Unknown value in a template
- **WHEN** a template uses a layout id or style value outside the allowed set
- **THEN** that template is skipped and the others still work

### Requirement: Template preview with sample data
When a user picks a template for PDF or DOCX, the builder SHALL show a preview of that template filled with sample data, not the user's own content. The preview SHALL be produced by the same renderer as the PDF download, SHALL update when another template is picked, and SHALL NOT be shown for Markdown. A browser that cannot show PDFs inline SHALL offer to open the preview instead.

#### Scenario: Picking a template
- **WHEN** a user selects the Modern template
- **THEN** a preview of the Modern design appears with sample names, jobs and skills

#### Scenario: Switching template
- **WHEN** the user selects a different template
- **THEN** the preview changes to that template's style and layout

#### Scenario: Own data untouched
- **WHEN** the preview is shown
- **THEN** it contains only sample content and nothing from the open resume

#### Scenario: Markdown
- **WHEN** the format is Markdown
- **THEN** no preview is shown

#### Scenario: No inline PDF viewer
- **WHEN** the browser cannot display PDFs inline
- **THEN** an "open preview" link is shown instead of an empty frame

### Requirement: Browser-side export in one template and format
The user SHALL pick one template and one format (PDF, DOCX or MD) and the browser SHALL generate that single file without sending the resume to a server for rendering. PDF SHALL follow the template's style as closely as possible. DOCX SHALL use real heading and paragraph styles, selectable text and no layout tables, using only fonts available in Word, so that converting it to PDF keeps the content and structure. MD SHALL contain the content without styling. No output SHALL contain a watermark.

#### Scenario: Generate a PDF
- **WHEN** a user with a valid resume picks a template and PDF
- **THEN** one PDF file downloads, styled by that template

#### Scenario: Generate DOCX
- **WHEN** a user picks DOCX
- **THEN** the file opens in Word with the content as styled text and no text rendered as images

#### Scenario: Only one output at a time
- **WHEN** a user presses Generate
- **THEN** exactly one file in the chosen template and format is produced

### Requirement: Resumes are private to their owner
Each resume SHALL be stored under its owner's verified Google email and SHALL be readable, changeable and deletable only by that owner. The owner SHALL be taken from the verified session, never from the request. No other user, including an admin, SHALL be able to read the content of another user's resume.

#### Scenario: Other user's resume
- **WHEN** user A requests a resume that belongs to user B, by id or by guessing a path
- **THEN** the response is 404 and nothing of B's data is returned

#### Scenario: Admin
- **WHEN** an admin requests a resume that belongs to another user
- **THEN** the response is 404 and no content is returned

#### Scenario: Owner claimed in the request
- **WHEN** a request body names a different owner email
- **THEN** the field is ignored and the session's email is used

#### Scenario: Changed Google email
- **WHEN** a person signs in with a different Google email
- **THEN** they are a new user with no access to the earlier email's resumes

### Requirement: Resume config is a separate file
Templates, role limits, the default structure and the structure rules SHALL come from a resume config file separate from the main profile, loaded per request through the server. Keys missing from the stored file SHALL be filled from a committed example file.

#### Scenario: Config edited
- **WHEN** an admin changes the resume config in the CMS
- **THEN** the builder reflects the change without a code change

#### Scenario: Key missing
- **WHEN** the stored resume config lacks a key present in the example
- **THEN** the example value is used
