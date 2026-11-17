## ADDED Requirements

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
