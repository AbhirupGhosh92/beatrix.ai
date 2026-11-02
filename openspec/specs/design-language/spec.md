# design-language Specification

## Purpose
Defines the shared visual language of the site: one set of shape, type, spacing and elevation rules used by both themes, a restrained neutral palette with one accent, and consistent motion including scroll animation. Only color and contrast differ between the light and dark themes.

## Requirements

### Requirement: Both themes share one design language
The light and dark themes SHALL use the same typeface, type scale, corner radius, border width, spacing, elevation and component shapes. The themes SHALL differ only in color values (surfaces, text, borders, accent and status colors) and the contrast that follows from them.

#### Scenario: Theme switch changes only color
- **WHEN** the user toggles between light and dark on any page
- **THEN** fonts, text case, sizes, corner radii, border widths, spacing and layout do not change, and only colors change

#### Scenario: Same component in both themes
- **WHEN** a button, card, input, badge, table or modal is viewed in each theme
- **THEN** it has identical geometry in both and differs only in its colors

### Requirement: Clean, minimal, professional appearance
The site SHALL use neutral surfaces and text, hairline borders, modest corner radius and near-flat elevation, and SHALL use a single accent color for interactive and emphasized elements, alongside the existing status colors (success, warning, error, info) used only for status.

#### Scenario: One accent
- **WHEN** a visitor views the home page, the resume builder, the job tracker and the admin pages
- **THEN** interactive and emphasized elements use the same single accent color rather than several brand colors

#### Scenario: No decorative styling
- **WHEN** any page is viewed in either theme
- **THEN** there are no gradients used as decoration, uppercase display lettering or decorative background effects

### Requirement: One typeface in normal case
Body text and headings SHALL use one sans-serif family in both themes in normal case, with hierarchy expressed through size and weight. The page SHALL NOT load additional decorative font families.

#### Scenario: Headings and buttons
- **WHEN** headings and buttons are viewed in either theme
- **THEN** they use the same family as body text in normal case

### Requirement: Readable contrast in both themes
All visible text SHALL have a contrast ratio of at least 4.5:1 against its background (3:1 for large text), and interactive elements SHALL have a visible focus indicator, in both themes.

#### Scenario: Contrast audit
- **WHEN** the home page, resume builder, job tracker and admin pages are audited in each theme
- **THEN** every visible text and icon meets the minimum ratio, including accent-colored text, muted text, badges and disabled-looking controls that remain readable

#### Scenario: Keyboard focus
- **WHEN** a user tabs through links, buttons and form fields
- **THEN** the focused element shows a clearly visible focus ring in both themes

### Requirement: Polished, consistent motion
Interactive state changes SHALL use the shared duration and easing scale. The site SHALL keep its hover and ambient effects (button glow, shine and lift, 3D card and avatar tilt, avatar aura, rotating hero roles, status ping dots, menu and list reveals) recolored with the palette, and SHALL NOT use glitch or wiggle effects. Loading spinners and skeleton placeholders MAY be used to show loading state.

#### Scenario: Hovering a button
- **WHEN** a visitor hovers a button
- **THEN** it lifts slightly with a glow in its own color and a shine sweep, in both themes

#### Scenario: No glitch or wiggle
- **WHEN** a visitor hovers the site title, a primary control or the back-to-top button in either theme
- **THEN** no glitch, jelly wiggle or periodic wobble animation plays

#### Scenario: Loading state
- **WHEN** content is loading
- **THEN** a spinner or skeleton placeholder is shown

### Requirement: Scroll-driven animation
Sections SHALL animate with the page scroll in the manner of product pages: content fades, rises and scales into place as it enters the viewport with staggered children, selected hero and image elements shift with scroll progress (parallax), and a progress indicator shows how far the page is scrolled. Scroll animations SHALL play once per element unless they are scroll-linked, and SHALL NOT delay access to content.

#### Scenario: Section enters the viewport
- **WHEN** a section scrolls into view
- **THEN** its heading and content fade and rise into place, with children staggered slightly

#### Scenario: Scroll-linked hero
- **WHEN** the visitor scrolls away from the top of the page
- **THEN** the hero content moves, fades or scales in proportion to scroll progress and returns when scrolling back

#### Scenario: Scroll progress
- **WHEN** the visitor scrolls the page
- **THEN** a thin indicator at the top shows the fraction of the page scrolled

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion
- **THEN** scroll animations are disabled, all content is visible immediately and nothing moves with scroll

### Requirement: Existing structure and behavior are preserved
The overhaul SHALL keep every existing page, section, component, content item, route, theme toggle behavior (including the saved choice and the OS-preference default) and interactive feature, changing only how they look and animate.

#### Scenario: Components retained
- **WHEN** the site is compared before and after the overhaul
- **THEN** every section and component is still present and works the same way, including the draggable before/after achievement cards, the tabs, the drawer, the dropdown, the release notes modal and the code editors

#### Scenario: Rotating hero roles
- **WHEN** the hero lists several roles
- **THEN** they remain available from the profile content and rotate in the hero as before
