# Spec Delta

## ADDED Requirements

### Requirement: Landing page has a scroll-to-top button
`/` SHALL show the same scroll-to-top button as the bio page for every visitor, anonymous or signed in: it appears only near the bottom of the page and scrolls smoothly to the top (instantly under reduced motion).

#### Scenario: Scrolled to the bottom of the landing page
- **WHEN** a visitor scrolls to the bottom of `/`
- **THEN** the scroll-to-top button appears, and activating it brings the visitor to the top of the page

#### Scenario: Top of the landing page
- **WHEN** a visitor is at the top of `/`
- **THEN** the scroll-to-top button is not shown
