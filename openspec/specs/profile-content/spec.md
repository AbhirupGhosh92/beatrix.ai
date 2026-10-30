# profile-content Specification

## Purpose
All copy, labels, metrics and links of the landing page come from one JSON profile, so content changes never require code changes.

## Requirements

### Requirement: Content comes from the stored profile
The page SHALL render its text, labels, metrics and links from the profile JSON and SHALL NOT hardcode them in components.

#### Scenario: Profile edited
- **WHEN** the stored profile JSON is changed
- **THEN** the rendered page reflects the change without a code change or rebuild

### Requirement: Profile is fetched per request through the server
The root layout SHALL load the profile on the server per request via `getProfile()`, and components SHALL read it through `useProfile()`. Client code SHALL NOT import `profile.json` directly.

#### Scenario: Browser never contacts backend functions
- **WHEN** a visitor loads the page
- **THEN** only the Next.js server calls the private Cloud Function, and the browser receives rendered content

### Requirement: Missing keys fall back to the example profile
`getProfile()` SHALL fill any key absent from the stored file from `profile.example.json`, and SHALL fall back to `src/data/profile.json` in development and then to the example profile when no stored file is available.

#### Scenario: New field added to the type
- **WHEN** a field exists in `profile.example.json` but not in the stored profile
- **THEN** the page renders the example value for that field

### Requirement: Personal data stays private
The real profile, resume file and avatar SHALL be git-ignored, and the phone number SHALL NOT be published.

#### Scenario: Fresh clone
- **WHEN** the repository is cloned without private files
- **THEN** the site still builds and renders using the example profile
