# Spec Delta

## ADDED Requirements

### Requirement: Resume config can be created from the CMS
The admin file list SHALL always include `resume-config.json`, whether or not it has been saved yet. Opening it before it exists SHALL show the default resume config as unsaved content, so saving once creates the file with working values.

#### Scenario: File not created yet
- **WHEN** an admin opens `resume-config.json` and no stored file exists
- **THEN** the editor shows the default resume config, marked as unsaved, and the list shows the file as not yet created

#### Scenario: Saving creates it
- **WHEN** the admin saves that content
- **THEN** `cms/resume-config.json` exists with those values and the next resume builder request uses them

#### Scenario: Existing file untouched
- **WHEN** a stored `resume-config.json` exists
- **THEN** the editor shows the stored content and never replaces it with the default
