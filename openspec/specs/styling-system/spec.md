# styling-system Specification

## Purpose
Defines how the site is styled: where styling lives, how both themes are driven by shared tokens, and how components and third-party UI inherit one consistent look and motion behavior.

## Requirements

### Requirement: Styles live in dedicated stylesheets
Visual styling SHALL be defined in stylesheets organised by concern (theme tokens, base elements, component classes, effects, third-party adapters), and the global stylesheet entry point SHALL only import them in a fixed order.

#### Scenario: Locating a style
- **WHEN** a developer needs to change how surfaces, badges or hover effects look
- **THEN** the rule is found in the stylesheet for that concern and not in a component file

### Requirement: Components apply semantic classes for visual identity
Colors, surfaces, typography, borders and effects SHALL be applied to components through named semantic classes. Structural layout utilities (flex, grid, gap, spacing, responsive layout) MAY remain on components.

#### Scenario: Restyling a surface
- **WHEN** the definition of the shared surface class is changed
- **THEN** every component using it changes accordingly with no component edit

#### Scenario: New component
- **WHEN** a new component applies the shared semantic classes
- **THEN** it has the same look and hover and motion behavior as existing components

### Requirement: Both themes render from shared tokens
Light and dark themes SHALL be defined only by theme tokens, and semantic classes SHALL read those tokens so that switching theme restyles every component without per-component overrides.

#### Scenario: Theme switch
- **WHEN** the user toggles the theme
- **THEN** all semantic classes update to the other theme's tokens and text keeps at least 4.5:1 contrast (3:1 for large text)

### Requirement: Third-party UI inherits the app theme
Embedded third-party UI (the code editor and the JSON tree viewer) SHALL take its colors from a shared code palette defined with the other theme tokens, through adapters that live with the other styles.

#### Scenario: Token change reaches the editor
- **WHEN** a code palette token such as the code background color changes
- **THEN** the editor and JSON viewer reflect it in both themes without edits to the component that embeds them

#### Scenario: Adding another library
- **WHEN** a new third-party UI library is added
- **THEN** it can be aligned with the app by adding one adapter that maps its theming hooks to the shared tokens

### Requirement: Refactoring preserves appearance and behavior
Reorganising styles without a stated design change SHALL NOT change the rendered appearance, fonts, palette, interaction effects or layout of the site in either theme at any width from 320px to 1920px. A deliberate redesign SHALL be specified by the `design-language` capability, SHALL keep the layout, content and behavior of the site, and SHALL be reviewed in both themes at 320px, tablet and desktop widths.

#### Scenario: Phase check
- **WHEN** a styling phase is completed that is not a redesign
- **THEN** both themes are reviewed at 320px, tablet and desktop widths and show no visual difference from before the phase

#### Scenario: Redesign check
- **WHEN** the design-language overhaul is completed
- **THEN** both themes are reviewed at 320px, tablet and desktop widths, every page keeps its layout, content and behavior, and every visual difference is explained by the design-language requirements

### Requirement: Reduced motion is respected
All transitions, animations and scroll-reveal movement SHALL be disabled or reduced to an instant change when the user prefers reduced motion. Loading spinners MAY continue.

#### Scenario: Reduced-motion preference
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** hover and focus transitions, shine and tilt effects, menu transitions, scroll animations and the sliding tab indicator happen instantly without movement, and content is visible without waiting for an animation
