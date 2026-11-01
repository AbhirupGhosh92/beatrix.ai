## ADDED Requirements

### Requirement: Stub AI routes
Until real models are added, the service SHALL provide `POST /tailor`, `POST /score` and `POST /skill-match`. Each SHALL validate its JSON input, answer with a fixed, deterministic result that includes `"stub": true`, SHALL work without a model API key, and SHALL NOT store or log resume or job description content.

#### Scenario: Skill match stub
- **WHEN** a caller posts resume data and a job description to `/skill-match`
- **THEN** the response is 200 with a match percentage, matched and missing skill lists and `stub` true

#### Scenario: Tailor stub
- **WHEN** a caller posts resume data and a job description to `/tailor`
- **THEN** the response is 200 with resume data in the same shape and `stub` true

#### Scenario: Score stub
- **WHEN** a caller posts resume data to `/score`
- **THEN** the response is 200 with a fixed score, a list of suggestions and `stub` true

#### Scenario: Bad input
- **WHEN** a caller posts a body that is not the expected shape
- **THEN** the response is 422 and nothing is processed

### Requirement: Called only by the site's server
The service SHALL be called only by the site's Next.js server, never by a browser, and the site SHALL pass nothing from the request body that identifies the user.

#### Scenario: Browser access
- **WHEN** a page's browser code requests a service route directly
- **THEN** it has no URL or credential for it and the request cannot succeed

### Requirement: Source folder
The service's source SHALL live in `ai_backend/`, and the deploy tooling, infrastructure comments and documentation SHALL name that folder.

#### Scenario: Search for the old path
- **WHEN** the repository is searched for the `python/` source path in deploy scripts and docs
- **THEN** no reference remains
