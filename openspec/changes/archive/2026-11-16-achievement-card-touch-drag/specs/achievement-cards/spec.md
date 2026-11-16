# Spec Delta

## Purpose

Defines how the before/after achievement cards in the Experience section are operated: a draggable divider that reveals the pain points or the solutions, on desktop and on touch devices.

## ADDED Requirements

### Requirement: Cards start balanced
Each achievement card SHALL show the before (red) and after (green) sides equally, with the divider at the middle, and SHALL list neither pain points nor solutions until the divider is moved clearly to one side.

#### Scenario: Initial state
- **WHEN** the Experience section is first shown
- **THEN** every card's divider is at 50% and the card shows the drag hint instead of a list

### Requirement: Divider is dragged by its grip on every input type
The divider SHALL be moved by dragging its grip with a mouse, finger or pen, following the pointer smoothly between the two edges, and SHALL stay within the card.

#### Scenario: Drag on a touch device
- **WHEN** a person drags the grip left or right with a finger
- **THEN** the divider follows the finger smoothly and the card does not jump to either end

#### Scenario: Drag with a mouse
- **WHEN** a person drags the grip with a mouse
- **THEN** the divider follows the pointer and stops at the card's edges

### Requirement: Only the grip captures the gesture
A touch or click on the card outside the grip SHALL NOT move the divider, and a vertical swipe starting anywhere on the card SHALL scroll the page.

#### Scenario: Tap on the card body
- **WHEN** a person taps a side of the card away from the grip
- **THEN** the divider does not move

#### Scenario: Scrolling past a card on a phone
- **WHEN** a person swipes up or down with a finger on a card
- **THEN** the page scrolls normally

### Requirement: Divider is operable by keyboard
The grip SHALL be focusable and expose its position to assistive technology; the left and right arrow keys SHALL move it in steps, and Home and End SHALL move it to the edges.

#### Scenario: Arrow keys
- **WHEN** the grip has focus and the person presses the right arrow key
- **THEN** the divider moves right by a step and stops at the right edge

### Requirement: Lists follow the divider
While the red side covers clearly more than half of the card the card SHALL list its pain points, while the green side does it SHALL list its solutions, and near the middle it SHALL show the drag hint.

#### Scenario: Reveal pain points
- **WHEN** the divider is dragged clearly toward the green side so red dominates
- **THEN** the pain points are listed

#### Scenario: Reveal solutions
- **WHEN** the divider is dragged clearly toward the red side so green dominates
- **THEN** the solutions are listed

### Requirement: Reduced motion is respected
Under `prefers-reduced-motion` the divider SHALL NOT animate on its own; it SHALL move only while being dragged or operated by keyboard.

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion and presses an arrow key on the grip
- **THEN** the divider moves immediately without a transition
