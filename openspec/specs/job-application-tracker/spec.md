# job-application-tracker Specification

## Purpose
Lets signed-in users keep a private list of the jobs they applied to with each one's status and date, and turn a tailor JSON stored on an application into a linked resume in the resume builder.

## Requirements

### Requirement: Feature is gated by role and by a menu flag
The job tracker page and its API SHALL be available only to users holding `features:basic` (`user-base` and above) and only while the `job-tracker` menu item is enabled in the main config. The drawer menu SHALL show the item only when both hold.

#### Scenario: Enabled item for a base user
- **WHEN** a `user-base` user opens the drawer while the item is enabled
- **THEN** the Job tracker entry is shown and opens the tracker

#### Scenario: Reader
- **WHEN** a `reader` requests the tracker page or its API
- **THEN** the page redirects to `/` and the API answers 403, and the entry is not shown

#### Scenario: Item disabled
- **WHEN** the item's `enabled` flag is false and any user requests the page or API
- **THEN** the response is 404 and the entry is not shown, even for an admin

### Requirement: Quick navigation between the tracker and the resume builder
The job tracker's top bar SHALL have a button that opens the resume builder, and the resume builder's top bar SHALL have a button that opens the job tracker. Each button SHALL be shown only while the other feature's menu item is enabled in the main config, and both SHALL stay usable on phone widths.

#### Scenario: Both features enabled
- **WHEN** a user with feature access opens the job tracker while the `resume-builder` item is enabled
- **THEN** the top bar shows a Resume builder button that opens `/resume-builder`, and the builder's top bar shows a Job tracker button back

#### Scenario: Other feature disabled
- **WHEN** the `resume-builder` item is disabled
- **THEN** the job tracker's top bar shows no Resume builder button

#### Scenario: Phone width
- **WHEN** the page is 320px wide
- **THEN** the button is still reachable, showing at least its icon with an accessible name, and the top bar does not scroll horizontally

### Requirement: Application records
A user SHALL be able to add, view, edit and delete applications. An application SHALL have a company, a role, a status and an applied date, and MAY have a link to the direct job posting, notes, labels and a tailor JSON. Company and role SHALL be required and text lengths SHALL be limited.

#### Scenario: Add an application
- **WHEN** a user saves a company, a role, a status and a date
- **THEN** the application appears in their list with those values

#### Scenario: Missing required field
- **WHEN** a user saves an application without a company or a role
- **THEN** the save is rejected with the reason and nothing is stored

#### Scenario: Job posting link
- **WHEN** a user enters a job posting link that is not an http or https URL
- **THEN** the save is rejected with the reason

#### Scenario: Open the job posting
- **WHEN** a user selects the job posting link of an application
- **THEN** the posting opens in a new browser tab without giving the posted site access to the tracker page

#### Scenario: Delete an application
- **WHEN** a user deletes an application
- **THEN** it disappears from their list and its tailor JSON is removed with it, while a resume already created from it is kept

### Requirement: Status from a configured set
An application's status SHALL be one of the statuses in the resume config, which defaults to Saved, Applied, Interview, Offer, Rejected and Withdrawn. A status outside the set SHALL be rejected. An invalid status list in the config SHALL fall back to the default list.

#### Scenario: Change status
- **WHEN** a user moves an application from Applied to Interview
- **THEN** the list shows Interview

#### Scenario: Unknown status
- **WHEN** a request sets a status that is not in the configured set
- **THEN** it is rejected with a 400 and the stored status is unchanged

#### Scenario: Broken config
- **WHEN** the configured status list is empty or malformed
- **THEN** the default statuses are used and the page still works

### Requirement: Labels
A user SHALL be able to give an application several labels for quick lookup. A label SHALL be free text of limited length, compared without regard to case or surrounding spaces, and an application SHALL hold a limited number of distinct labels. The label entry SHALL suggest the user's existing labels.

#### Scenario: Add labels
- **WHEN** a user adds the labels "remote" and "android" to an application
- **THEN** both are shown on the application and saved with it

#### Scenario: Duplicate label
- **WHEN** a user adds "Remote" to an application that already has "remote"
- **THEN** the application still has one such label

#### Scenario: Too many or too long
- **WHEN** a request has more labels than the limit or a label over the length limit
- **THEN** it is rejected with the reason and the stored labels are unchanged

#### Scenario: Reuse an existing label
- **WHEN** a user starts typing a label they used on another application
- **THEN** that label is offered as a suggestion

### Requirement: Table with notes, search, sort and filter
The list SHALL be a table whose columns include company, role, status, applied date, labels and notes, with the newest applied date first by default. The user SHALL be able to search, sort and filter the list, and the page SHALL show how many applications match.

#### Scenario: Notes column
- **WHEN** an application has notes
- **THEN** the notes are shown in their own column, shortened when long, and in full when the application is opened

#### Scenario: Search
- **WHEN** a user types "android" in the search box
- **THEN** only applications whose company, role, notes or labels contain "android" are listed, ignoring case

#### Scenario: Sort
- **WHEN** a user selects the company, role, status or applied date column heading
- **THEN** the list is ordered by that column, and selecting it again reverses the order

#### Scenario: Filter by labels
- **WHEN** a user selects the labels "remote" and "android"
- **THEN** only applications that have both labels are listed

#### Scenario: Combined
- **WHEN** a user filters by status Interview, a label and a search text together
- **THEN** only applications that meet all three are listed, and clearing them restores the full list

#### Scenario: Filter by status
- **WHEN** a user filters by Interview
- **THEN** only applications with that status are listed

### Requirement: Private per user
Applications SHALL be readable and changeable only by the user who owns them, where the owner is the verified session's email and never a request field. An id that belongs to another user SHALL answer 404.

#### Scenario: Another user's id
- **WHEN** a user requests an application id owned by someone else
- **THEN** the response is 404 and nothing of it is revealed

#### Scenario: Admin
- **WHEN** an admin lists applications
- **THEN** they see only their own

### Requirement: Application cap by role
A base user SHALL hold at most the number of applications set in the resume config (3). A role with `features:advanced` SHALL have no cap, only a generous safety limit set in the same config. The cap and the safety limit SHALL hold when requests arrive in parallel, and the page SHALL show how many applications are used of the cap.

#### Scenario: Fourth application for a base user
- **WHEN** a base user with 3 applications adds another
- **THEN** the request is rejected with a clear message to delete one first, and no application is added

#### Scenario: Add button at the cap
- **WHEN** a base user holds 3 applications
- **THEN** the page shows "3 of 3 used", the Add application button is disabled and says to delete one to add another

#### Scenario: Deleting frees a slot
- **WHEN** that user deletes an application
- **THEN** they can add another

#### Scenario: Parallel adds
- **WHEN** a base user with 2 applications sends two add requests at the same time
- **THEN** exactly one succeeds

#### Scenario: Advanced user
- **WHEN** an advanced user with more than 3 applications adds another
- **THEN** it is accepted

#### Scenario: Safety limit
- **WHEN** an advanced user at the safety limit adds another application
- **THEN** it is rejected with a clear message and nothing is added

#### Scenario: Downgrade
- **WHEN** an advanced user with more than 3 applications becomes a base user
- **THEN** they can still open, edit and delete their applications but cannot add new ones until they hold fewer than 3

### Requirement: Tailor JSON
An application MAY hold a tailor JSON, which SHALL have the shape of a resume's data under the default structure. It SHALL be validated as a draft on save: unknown sections or fields, wrong types and over-long values are rejected, and empty or missing fields are accepted.

#### Scenario: Valid tailor JSON
- **WHEN** a user saves a tailor JSON that matches the structure
- **THEN** it is stored with the application

#### Scenario: Partial tailor JSON
- **WHEN** a user saves a tailor JSON with only a summary filled in
- **THEN** it is stored

#### Scenario: Invalid tailor JSON
- **WHEN** the text is not JSON, or has a section or field the structure does not define, or a value over its limit
- **THEN** the save is rejected with the reasons and the stored tailor JSON is unchanged

### Requirement: Create a tailored resume
A user SHALL be able to create a resume from an application's tailor JSON with one action. The new resume SHALL appear in the resume builder with the tailor JSON as its content, be titled after the company and role, and be linked to the application. An application SHALL have at most one linked resume at a time.

#### Scenario: Create from tailor JSON
- **WHEN** a user presses Create tailored resume on an application that has a tailor JSON
- **THEN** a resume with that content exists in their resume list and the application shows a link to open it

#### Scenario: No tailor JSON
- **WHEN** an application has no tailor JSON
- **THEN** the action is not offered and a direct request is rejected

#### Scenario: Already linked
- **WHEN** an application already has a linked resume that still exists
- **THEN** the action opens that resume instead of creating another

#### Scenario: Linked resume deleted
- **WHEN** the user deletes the linked resume in the resume builder
- **THEN** the application no longer shows a link and the action is offered again

### Requirement: Tailored resumes use the resume cap
A tailored resume SHALL count as a resume under the resume cap. A base user SHALL be refused a new tailored resume while holding the maximum number of resumes, and a role with `features:advanced` SHALL never be refused for the cap. The cap SHALL hold when requests arrive in parallel.

#### Scenario: Base user at the cap
- **WHEN** a base user with 3 resumes presses Create tailored resume
- **THEN** it is refused with a message to delete a resume first, and the application is unchanged

#### Scenario: Slot freed
- **WHEN** that user deletes a resume and tries again
- **THEN** the tailored resume is created

#### Scenario: Advanced user
- **WHEN** an advanced user with more than 3 resumes creates a tailored resume
- **THEN** it is created

#### Scenario: Parallel creates
- **WHEN** a base user with 2 resumes triggers two tailored resumes at the same time
- **THEN** exactly one succeeds

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
