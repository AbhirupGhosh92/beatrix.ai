# resume-data-retention Specification

## Purpose
Defines how long resume data survives user actions and revoked access, and how admins find and permanently remove data left behind by revoked accounts without ever reading it.

## Requirements

### Requirement: Recoverable for 30 days after user actions
When a user deletes or overwrites a resume, the previous version SHALL remain recoverable by an operator for 30 days and SHALL be permanently removed after that.

#### Scenario: User deletes a resume
- **WHEN** a user deletes a resume
- **THEN** it disappears for the user at once and the stored data can be restored by an operator within 30 days

#### Scenario: Window passes
- **WHEN** 30 days have passed since the deletion or overwrite
- **THEN** the old data no longer exists anywhere in storage

### Requirement: Revoking access keeps resume data
Revoking a user's access SHALL NOT delete or change their resumes. Restoring access SHALL give the user their resumes back unchanged.

#### Scenario: Revoke and restore
- **WHEN** an admin revokes a user and later restores them
- **THEN** the user finds all resumes as they left them

#### Scenario: Revoked user cannot read
- **WHEN** a revoked user's data still exists
- **THEN** that user cannot read it, because they cannot sign in

### Requirement: Admins can list orphaned resume data
An admin SHALL be able to list owners that still hold resume data but whose access is revoked or whose allow-list entry no longer exists. Each row SHALL show only the email, the number of resumes, the total size and the last update time, and never resume content or titles.

#### Scenario: Orphan appears
- **WHEN** a user with 2 resumes is revoked
- **THEN** the admin list shows that email with a count of 2 and its size

#### Scenario: Active user hidden
- **WHEN** a user with resumes still has access
- **THEN** they are not in the list

#### Scenario: No content exposed
- **WHEN** an admin opens the list
- **THEN** no field of any row contains resume text

### Requirement: Admin hard delete of orphaned data
An admin SHALL be able to permanently delete all resume data of an orphaned owner. The delete SHALL remove every stored version with no recovery, SHALL require the admin to type the owner's email to confirm, and SHALL be refused for an owner whose access is active. Each delete SHALL be logged with the admin, the owner and the time.

#### Scenario: Delete an orphan
- **WHEN** an admin confirms the delete of a revoked owner's data
- **THEN** all resumes and their older versions are removed, the owner leaves the list and the action is logged

#### Scenario: Active owner
- **WHEN** an admin tries to delete the data of a user who still has access
- **THEN** the request is rejected and nothing is deleted

#### Scenario: Wrong confirmation
- **WHEN** the typed email does not match the owner
- **THEN** nothing is deleted

#### Scenario: Not an admin
- **WHEN** a non-admin calls the list or delete endpoint
- **THEN** the response is 403 and nothing is returned or deleted

### Requirement: Revoking access keeps applications
Revoking a user's access SHALL NOT delete or change their job applications. Restoring access SHALL give the user their applications back unchanged.

#### Scenario: Revoke and restore
- **WHEN** an admin revokes a user and later restores them
- **THEN** the user finds all applications as they left them

### Requirement: Orphaned data includes applications
The admin list of orphaned data SHALL include owners that hold only applications, and each row SHALL also show the number of applications. Rows SHALL never contain application content such as companies, roles, notes or tailor JSON.

#### Scenario: Owner with only applications
- **WHEN** a user with 5 applications and no resumes is revoked
- **THEN** the admin list shows that email with 0 resumes and 5 applications

#### Scenario: No content exposed
- **WHEN** an admin opens the list
- **THEN** no field of any row contains application text

### Requirement: Admin hard delete covers applications
The admin hard delete of an orphaned owner SHALL also permanently remove all of that owner's applications, with the same email confirmation, active-owner refusal and audit log as for resumes.

#### Scenario: Delete an orphan
- **WHEN** an admin confirms the delete of a revoked owner's data
- **THEN** their resumes and applications are all removed and the owner leaves the list

#### Scenario: Active owner
- **WHEN** an admin tries to delete the data of a user who still has access
- **THEN** the request is rejected and nothing is deleted
