# Spec Delta

## ADDED Requirements

### Requirement: Resume storage is protected and deployed separately
The resumes bucket and the per-owner index SHALL be protected resources: the plan guard SHALL block their deletion or replacement, and the bucket SHALL keep deleted versions for 30 days. The resume functions SHALL be deployed only when the functions component source hash changed, and a deploy SHALL NOT write or delete resume data or the resume config.

#### Scenario: Plan deletes the resumes bucket
- **WHEN** a plan would delete or replace the resumes bucket
- **THEN** the run fails before approval and apply

#### Scenario: Unrelated change
- **WHEN** a deploy changes only the landing page
- **THEN** the resume functions and the stored resumes are untouched
