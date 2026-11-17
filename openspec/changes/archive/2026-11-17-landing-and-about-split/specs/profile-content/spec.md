# Spec Delta

## ADDED Requirements

### Requirement: Bio page is served at /about
The bio page (hero, stats, about, experience, skills, education, beyond code and upcoming projects) SHALL be served at `/about` with content from the stored profile, and SHALL NOT be served at `/`. It SHALL show a visible link to `/`.

#### Scenario: Shared resume link
- **WHEN** anyone, signed in or not, opens `/about`
- **THEN** the bio page renders from the profile and shows a link to the main site at `/`

#### Scenario: Link back to the main site
- **WHEN** a visitor uses the link to the main site on `/about`
- **THEN** they arrive at `/`

### Requirement: About page is not linked for anonymous visitors
No page SHALL link to `/about` for an anonymous visitor, and the sidebar and its menu button SHALL stay hidden for anonymous visitors on every page. A signed-in user SHALL see an "About me" drawer entry, configured as a drawer item in the profile, that opens `/about`.

#### Scenario: Anonymous visitor on the landing page
- **WHEN** an anonymous visitor views `/`
- **THEN** no menu button, drawer or link to `/about` is shown

#### Scenario: Signed-in user opens About me
- **WHEN** a signed-in user opens the drawer and chooses "About me"
- **THEN** the browser navigates to `/about`

#### Scenario: About me switched off
- **WHEN** the "About me" item's `enabled` is false in the stored profile
- **THEN** the drawer does not list it, while `/about` stays reachable by URL
