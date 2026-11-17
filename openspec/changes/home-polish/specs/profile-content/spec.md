# Spec Delta

## MODIFIED Requirements

### Requirement: Bio page is served at /about
The bio page (hero, stats, about, experience, skills, education, beyond code and upcoming projects) SHALL be served at `/about` with content from the stored profile, and SHALL NOT be served at `/`. It SHALL NOT show a link or redirect to `/`.

#### Scenario: Shared resume link
- **WHEN** anyone, signed in or not, opens `/about`
- **THEN** the bio page renders from the profile and no control on the page navigates to `/`

#### Scenario: Link back to the main site
- **WHEN** a visitor looks at the navbar on `/about`
- **THEN** there is no "Main site" button or other link to `/`
