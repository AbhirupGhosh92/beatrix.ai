# Spec Delta

## ADDED Requirements

### Requirement: Admin area has a top navbar
`/admin` SHALL show a top navbar with a CMS entry (`/admin/cms`) and an Access entry (`/admin/access`), highlight the current one, and redirect `/admin` to `/admin/cms`.

#### Scenario: Navigate between sections
- **WHEN** an admin clicks Access in the navbar
- **THEN** the Access page opens and Access is highlighted, with the CMS editor one click away

#### Scenario: Bare admin URL
- **WHEN** an admin opens `/admin`
- **THEN** they are redirected to `/admin/cms`
