## ADDED Requirements

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

## MODIFIED Requirements

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
