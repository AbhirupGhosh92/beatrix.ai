# landing-page Specification

## Purpose
The default page at `/` that every visitor lands on: configurable content, Google sign-in, a signed-in state and the release notes, driven by an editable home config separate from the profile.

## Requirements

### Requirement: Everyone lands on the landing page
`/` SHALL render the landing page for every visitor, anonymous or signed in, and SHALL NOT redirect a signed-in user to `/about`. Denied pages SHALL still redirect to `/`.

#### Scenario: Anonymous visitor
- **WHEN** an anonymous visitor opens `/`
- **THEN** they see the landing content and the Google sign-in button and nothing from the bio page

#### Scenario: Signed-in user
- **WHEN** a signed-in user opens `/`
- **THEN** they see the landing page, not the bio page

### Requirement: Signed-in state
For a signed-in user the landing page SHALL replace the Google sign-in button with a signed-in state and a way to open the drawer or go to About.

#### Scenario: Signed-in user sees the state
- **WHEN** a signed-in user views `/`
- **THEN** the sign-in button is not shown and the signed-in state with the way to the drawer or About is shown

### Requirement: Landing content comes from the home config
The landing page SHALL render its text, labels and links from the home config and SHALL NOT hardcode them. The home config SHALL be stored separately from the profile, read by the Next.js server through a private function, and fall back per missing key to a committed example (and to the example alone when nothing is stored). An invalid stored value SHALL be replaced by the example's value for that key. It SHALL ship with placeholder items.

#### Scenario: Home config edited
- **WHEN** the stored home config is changed
- **THEN** the landing page reflects the change without a code change or rebuild

#### Scenario: Nothing stored yet
- **WHEN** no home config has been saved
- **THEN** the landing page renders the example's placeholder content

#### Scenario: Missing or invalid key
- **WHEN** a key is absent or invalid in the stored home config
- **THEN** the example's value for that key is used and the page still renders

### Requirement: Home config is editable in the admin panel
`/admin/cms` SHALL always list the home config for roles holding `cms:write`; until it is first saved it SHALL open as the example, marked unsaved, so one Save creates it.

#### Scenario: First save
- **WHEN** an admin opens the home config before it was ever saved and saves it
- **THEN** the stored file is created from what the editor shows

### Requirement: Release notes appear on the landing page only
The version button and release notes modal SHALL show on `/` and SHALL NOT show on `/about` or any other page. They SHALL render nothing when no release exists.

#### Scenario: On the landing page
- **WHEN** a release exists and a visitor views `/`
- **THEN** the version button is shown and opens the notes

#### Scenario: On the About page
- **WHEN** a visitor views `/about`
- **THEN** no version button is shown
