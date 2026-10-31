## ADDED Requirements

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
