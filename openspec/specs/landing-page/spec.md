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

### Requirement: Anonymous landing is an AI platform product page
For an anonymous visitor, `/` SHALL present the app as an AI-powered career platform: a headline with a value proposition and the Google sign-in, a feature section, a how-it-works section and a closing sign-in call to action. It SHALL NOT show the owner's bio, experience, resume facts or statistics.

#### Scenario: Anonymous visitor sees the product page
- **WHEN** an anonymous visitor opens `/`
- **THEN** they see the headline, the sign-in button, the feature section, the how-it-works section and the closing call to action, and none of the bio page's content

#### Scenario: Signed-in user
- **WHEN** a signed-in user opens `/`
- **THEN** they still see the signed-in state and the sign-in calls to action are not shown

### Requirement: Features shown are real and honestly labelled
Every feature on the landing page SHALL describe a capability that exists in the app. A feature whose result is a placeholder while the AI service is not backed by a model SHALL be labelled as an early preview. The page SHALL NOT advertise unbuilt features, pricing, user counts or testimonials.

#### Scenario: Feature list
- **WHEN** the landing page lists its features
- **THEN** each one matches an existing capability (resume builder, resume score, AI tailor and skill match, job tracker, private storage, role-based access)

#### Scenario: Preview label
- **WHEN** a feature is backed by a placeholder AI result
- **THEN** its card shows an early preview label

### Requirement: Product page content comes from the home config
The feature cards, steps, labels and calls to action of the product page SHALL come from the home config (text, an ordered list of features with icon names from a closed set, steps and a preview label), with the example as the per-key fallback. An invalid or oversized list SHALL be replaced by the example's list so the page always renders.

#### Scenario: Feature edited in the admin panel
- **WHEN** an admin changes a feature's title in the home config and saves
- **THEN** the landing page shows the new title without a code change or rebuild

#### Scenario: Invalid list
- **WHEN** the stored features value is not a valid list
- **THEN** the example's features are shown and the page renders

### Requirement: Responsive and accessible product page
The product page SHALL work from 320px to 1920px in both themes, use headings in order, keep text contrast at or above WCAG AA, and render without motion under `prefers-reduced-motion`.

#### Scenario: Phone width
- **WHEN** the page is viewed at 320px wide
- **THEN** no horizontal scroll appears and the feature grid is a single column

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion
- **THEN** sections render without entrance animation

### Requirement: Landing page has a scroll-to-top button
`/` SHALL show the same scroll-to-top button as the bio page for every visitor, anonymous or signed in: it appears only near the bottom of the page and scrolls smoothly to the top (instantly under reduced motion).

#### Scenario: Scrolled to the bottom of the landing page
- **WHEN** a visitor scrolls to the bottom of `/`
- **THEN** the scroll-to-top button appears, and activating it brings the visitor to the top of the page

#### Scenario: Top of the landing page
- **WHEN** a visitor is at the top of `/`
- **THEN** the scroll-to-top button is not shown

### Requirement: Home shows random published blog headers
The public home page SHALL include a block of randomly chosen published blog headers, each showing its author's name and opening the post's read-only page, when the blog is on and at least one published post exists; see the `blog` capability. It SHALL NOT change the product page content for anonymous visitors otherwise.

#### Scenario: Blog on with posts
- **WHEN** an anonymous visitor opens `/` and published posts exist
- **THEN** the block shows the configured number of random headers, each with an author name

#### Scenario: Clicking a header
- **WHEN** a visitor clicks a header in the block
- **THEN** the post's read-only page opens

#### Scenario: Blog off
- **WHEN** the blog is switched off in the config
- **THEN** `/` renders exactly as before, without the block
