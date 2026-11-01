# resume-builder Specification

## Purpose
Lets signed-in users with feature access build resumes from a structured, validated form, export them in several styles and formats from the browser, and keep them privately stored per user.

## Requirements

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
The preview SHALL be produced by the same renderer as the PDF download and SHALL update when another template is picked. The workspace canvas SHALL always show the chosen template, whichever download format is selected; because a Markdown download has no styling, the page SHALL say so while Markdown is selected. A browser that cannot show PDFs inline SHALL offer to open the preview instead.

#### Scenario: Switching template
- **WHEN** the user selects a different template
- **THEN** the preview changes to that template's style and layout

#### Scenario: Markdown
- **WHEN** the download format is Markdown
- **THEN** the canvas still shows the chosen template and a note says the Markdown file has no styling

#### Scenario: No inline PDF viewer
- **WHEN** the browser cannot display PDFs inline
- **THEN** an "open preview" link is shown instead of an empty frame

### Requirement: Workspace layout
The open resume SHALL be edited in a workspace: a header, a side panel with Content, AI and Design tabs, a large live preview canvas showing the resume as the chosen template draws it, and a quick-actions rail. The header SHALL show the resume's name with inline rename, a sync-state icon and a download control that offers PDF, DOCX and Markdown. On phone widths the panels SHALL stack or become switchable so every control stays reachable without horizontal page scroll.

#### Scenario: Opening a resume
- **WHEN** a user opens a resume
- **THEN** the canvas shows the live preview, the Content tab lists the sections, and the header shows the name and sync state

#### Scenario: Rename in the header
- **WHEN** the user edits the name in the header
- **THEN** the title changes, is saved by the role's normal save mode, and the resume list shows it

#### Scenario: Download from the header
- **WHEN** a user with a valid resume chooses PDF, DOCX or Markdown in the download control
- **THEN** exactly one file in that format and the selected template downloads, and an invalid resume is refused with the missing fields listed

#### Scenario: Phone width
- **WHEN** the workspace is viewed at 320px wide
- **THEN** the panels are reachable one at a time and the page does not scroll horizontally

### Requirement: Collapsible and reorderable sections
Sections in the Content tab SHALL be collapsible and SHALL be reorderable by dragging the section title and by keyboard, with no separate drag handle icon. The order SHALL be a per-resume view setting used by the preview and all exports, SHALL NOT change the structure, and SHALL be available to every role, including base users. The server SHALL accept an order only when it lists each section exactly once.

#### Scenario: Base user reorders
- **WHEN** a base user drags Skills above Experience and saves
- **THEN** the preview and exports list Skills first, and the stored structure is unchanged

#### Scenario: Invalid order
- **WHEN** a save carries an order that repeats or omits a section id
- **THEN** the server rejects it with a 400 and stores nothing

#### Scenario: Structure changes
- **WHEN** an advanced user adds a section to the structure
- **THEN** the new section appears at the end and a removed section drops out of the order

#### Scenario: Keyboard
- **WHEN** a user focuses a section's title and presses Alt with the up or down arrow key
- **THEN** the section moves and the new position is announced to assistive technology

#### Scenario: Feedback while reordering
- **WHEN** a user drags a section title over another section and drops it
- **THEN** the dragged section looks lifted, the section it is over is highlighted, the sections slide to their new places, and the moved section is briefly highlighted, and with reduced motion preferred the sliding is skipped

#### Scenario: Header stays on top
- **WHEN** a user reorders sections
- **THEN** the first section of the structure (name and contact line) stays at the top and cannot be dragged or moved

### Requirement: Summary variants
The summary SHALL be able to hold several variants. Exactly one variant SHALL be active; the preview and every export SHALL use only the active variant. A resume saved before this change SHALL open with its single summary as the only, active variant.

#### Scenario: Add a variant
- **WHEN** a user adds a second summary and marks it active
- **THEN** the preview and exports use the second summary and the first stays stored

#### Scenario: Existing resume
- **WHEN** a resume created before this change is opened
- **THEN** its summary text is shown as one active variant and nothing is lost

#### Scenario: Remove the active variant
- **WHEN** a user removes the active variant while others exist
- **THEN** another variant becomes active

### Requirement: Resume score from fixed rules
The workspace SHALL show a Resume Score from 0 to 100 computed in the browser from fixed rules over the resume's own content (for example completeness of required and common sections, bullet length and count, and measurable results) and SHALL list the rules that cost points so the user can act on them. The score SHALL NOT use sample text, SHALL NOT be sent to a server, and SHALL NOT block saving or generating.

#### Scenario: Empty resume
- **WHEN** a user opens a new empty resume
- **THEN** the score is low and lists the missing sections as the reasons

#### Scenario: Improving the resume
- **WHEN** the user fills a section the score flagged
- **THEN** the score rises and that reason disappears without a reload

#### Scenario: Sample text
- **WHEN** a field is empty and the preview shows sample text for it
- **THEN** the score treats the field as empty

### Requirement: AI actions through the server
Skill Match and Tailor for Job SHALL be offered to users holding `features:basic` while the resume builder item is enabled. The browser SHALL call only the site's own API, and the Next.js server SHALL forward the resume content and job description to the AI service as the site's service identity, taking the caller from the verified session and never from the request body.

#### Scenario: Skill match
- **WHEN** a user pastes a job description and presses Skill Match
- **THEN** the AI tab shows the returned match percentage with matched and missing skills and a notice that the result is a placeholder

#### Scenario: Tailor for a job
- **WHEN** a user presses Tailor for Job with a job description
- **THEN** the suggested resume content is shown for review with a placeholder notice, and the open resume is unchanged until the user applies it

#### Scenario: Apply replaces the content
- **WHEN** the user applies a tailored suggestion
- **THEN** the open resume's content becomes the suggestion and is saved by the role's normal save mode

#### Scenario: From a tracked application
- **WHEN** the user opens Tailor for Job from a job application that has a job posting link or notes
- **THEN** that text can be used as the job description

#### Scenario: Reader or feature off
- **WHEN** a `reader` calls an AI action, or the resume builder item is disabled
- **THEN** the response is 403 for the reader and 404 when disabled, and nothing is forwarded

#### Scenario: AI service unavailable
- **WHEN** the AI service cannot be reached
- **THEN** the user sees a clear message, the resume is unchanged and the rest of the workspace keeps working

### Requirement: Placeholder AI results are labelled
While the AI service answers with stub results, the interface SHALL say so wherever such a result is shown, and a stub result SHALL NOT change the open resume until the user applies it.

#### Scenario: Stub notice
- **WHEN** an AI action returns a result with `stub` true
- **THEN** the result is shown with a notice that it is a placeholder

#### Scenario: Real result
- **WHEN** a result arrives with `stub` false or absent
- **THEN** no placeholder notice is shown

### Requirement: Templates gallery
The Design tab SHALL offer a gallery of the enabled templates from the resume config, and choosing one SHALL change the canvas preview and the template used for download. The quick-actions rail SHALL NOT list templates. Templates SHALL still come only from the resume config.

#### Scenario: Choose a template
- **WHEN** a user picks another template in the gallery
- **THEN** the canvas redraws in that template and the next download uses it

#### Scenario: No templates
- **WHEN** no template is enabled
- **THEN** the gallery says so and Markdown download still works

### Requirement: JSON is edited with the shared JSON editor
Wherever the resume builder lets a user edit JSON, including the structure editor for advanced users, it SHALL use the same JSON editor component as the CMS editor and SHALL NOT use a plain text area. Existing validation of the JSON SHALL be unchanged.

#### Scenario: Structure editor
- **WHEN** an advanced user opens Edit structure
- **THEN** the structure is shown in the shared JSON editor with its syntax highlighting and code and tree views

#### Scenario: Invalid JSON
- **WHEN** the user applies text that is not valid JSON or breaks the structure rules
- **THEN** the reasons are listed and the previous structure stays, as before

### Requirement: Existing guarantees hold in the workspace
The workspace SHALL NOT change who may use the resume builder, resume ownership and privacy, the resume cap, save modes, validation before generation, the absence of sample text in generated files, or browser-side export.

#### Scenario: Generate with an incomplete resume
- **WHEN** a required field is empty and the user presses download
- **THEN** generation is refused with the missing fields listed, and no file contains sample text

#### Scenario: Another user's resume
- **WHEN** user A requests user B's resume or runs an AI action against it
- **THEN** the response is 404 and nothing of B's data is returned
