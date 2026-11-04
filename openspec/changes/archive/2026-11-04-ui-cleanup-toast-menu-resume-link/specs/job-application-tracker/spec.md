# Spec Delta

## MODIFIED Requirements

### Requirement: Table with notes, search, sort and filter
The list SHALL be a table whose columns include company, role, status, applied date, labels, notes and the linked resume, with the newest applied date first by default. The user SHALL be able to search, sort and filter the list, and the page SHALL show how many applications match.

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

#### Scenario: Linked resume shown
- **WHEN** an application is linked to a resume that still exists
- **THEN** its row shows that resume's title as a link that opens the resume in the builder

#### Scenario: No linked resume
- **WHEN** an application has no linked resume, or the linked resume was deleted
- **THEN** its resume cell is blank
