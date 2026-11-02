# Spec Delta

## MODIFIED Requirements

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
