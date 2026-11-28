## Context

The editor is a host-independent component (`src/components/editor/RichEditor.tsx`, `RichEditorHost`) rendering one card: `.rich-editor` > `EditorToolbar` (sticky, offset by `--editor-toolbar-top: 4.1rem` for the blog page's sticky header) > `EditorContent` > `ImageToolbar` (BubbleMenu) > hidden file input > `UploadStatus` > hint line. The toolbar's own `onKeyDown` handles Escape: it closes any open panel **and always** calls `preventDefault`, `stopPropagation` and refocuses the editor. The page's snackbar host is `z-index: 60`, the sticky page header `z-30`; the image editing `<dialog>` is a native modal (top layer). No ancestor of the editor on the blog path sets `transform`, `filter`, `will-change` or `contain` (checked: only the header has `backdrop-blur`).

A full-screen toggle needs the **same React tree and the same ProseMirror view** before and after, otherwise selection, undo history and unsaved typing would be lost. No cloud, function, config, schema, API or stored-format change is needed (the state is purely UI and never leaves the component).

## Goals / Non-Goals

**Goals:** everything in the spec; the shared editor stays host-independent (no new host prop is required).
**Non-goals:** the proposal's out-of-scope list; a "Save" control inside full screen (see Risks); the browser Fullscreen API.

## Decisions

### D1. Full screen is a CSS mode of the existing card, not a portal and not the Fullscreen API
`RichEditor` holds `const [full, setFull] = useState(false)` and puts the modifier class `rich-editor--full` on the same `.rich-editor` element. In that mode the card is `position: fixed; inset: 0` (with `height: 100dvh` so mobile browser bars do not hide the bottom), `max-width: none`, no radius or border, `z-index: 50` (above the sticky page header z-30 and the drawer, below the snackbar host z-60 so error and success messages stay visible), `display: flex; flex-direction: column`. Because the element and its children keep their identity, the text, selection, undo history and unsaved changes survive the switch with no extra work, and nothing is stored (the state is local and not in the document, the host or `localStorage`). Rejected: (a) a React portal to `body` (a component moving between parents is remounted, which would destroy the ProseMirror view); (b) the browser Fullscreen API (not supported for arbitrary elements on iOS Safari, needs a user gesture and shows browser chrome prompts, and Escape is then handled by the browser); (c) a separate full-screen editor instance with copied content (loses undo history and doubles upload and state handling).
The one assumption of D1 is that no ancestor creates a containing block for fixed elements; true today (checked above). The Builder verifies with a measurement (the card's `getBoundingClientRect` equals the viewport) and reports; a future ancestor with `transform` would break it, which is noted in `CLAUDE.md`.

### D2. Layout while full screen
Flex column: the toolbar is `flex: none` and **not sticky** (`position: static`, `--editor-toolbar-top` unused), with `max-height: 45dvh; overflow-y: auto` so five wrapped rows plus an open panel on a 375px phone cannot push the text out of view (the measured 398px panel case from the previous change); the content wrapper `.rich-editor-content` is `flex: 1 1 auto; min-height: 0; overflow-y: auto` with `overscroll-behavior: contain`, so the text scrolls inside and the toolbar stays on top; `UploadStatus` stays `flex: none` under the text (uploads still show progress and errors); the hint line is hidden to save room. Text keeps the normal column width centred with side padding (a wider reading line is not the goal; "stretch" means the card, and a very wide measure hurts reading), so the content wrapper has `padding-inline: clamp(1rem, 5vw, 3rem)` and its inner `.ProseMirror` keeps its current `max-width`. The ImageToolbar bubble menu is positioned by floating-ui relative to the selected image and clips to the viewport, so it works in the scroll container; the Builder checks it, and the image editing dialog is a native modal that sits above everything.

### D3. Page behind does not scroll
While `full`, an effect sets `document.documentElement.style.overflow = 'hidden'` and restores the previous inline value in its cleanup, so leaving full screen, unmounting the editor (navigating away, closing the post) or a React Strict Mode double effect always releases it. Rejected: a `body` class managed outside the component (leaks when the component unmounts) and `position: fixed` on `body` (resets the scroll position).

### D4. Toggle button
A last "View" group in `EditorToolbar` holds one button: icon `Maximize2` / `Minimize2`, constant accessible name "Full screen", `aria-pressed={full}` (so the state is announced), `title` "Full screen (Esc to exit)" / "Exit full screen (Esc)", same `ToolButton` as the others (mouse-down `preventDefault` keeps the selection). `EditorToolbar` receives `fullscreen` and `onToggleFullscreen` props from `RichEditor`; the host contract (`RichEditorHost`) is unchanged, so every host gets the feature and none needs to know about it. Wider than 640px the group is pushed to the right end (`margin-inline-start: auto`); below that it joins the flow like the others.

### D5. Escape precedence and focus
Order, innermost first: (1) the image editing dialog owns its Escape (native `cancel`); (2) an open toolbar panel (color, highlight, link, image URL) closes; (3) otherwise Escape leaves full screen. To make (2) and (3) not collide, the toolbar's Escape handler changes: if a panel is open it closes it and keeps `preventDefault` + `stopPropagation` as now; if none is open it only refocuses the editor and lets the event bubble (so the key still reaches the full-screen handler; outside full screen nothing else listens, so behavior is unchanged). `RichEditor` registers, only while `full`, a `keydown` listener on `document` (so Escape works even when focus was lost to `body`) that exits when `event.key === 'Escape'`, `!event.defaultPrevented` and `!document.querySelector('dialog[open]')`, then focuses the editor. Pressing the button keeps focus on the button (the same element), Escape moves focus into the text.
Focus containment: full screen covers the page but the page behind is still in the tab order, so while `full` the card gets `role="dialog"`, `aria-modal="true"` and `aria-label="Full screen editor"`, and a Tab handler wraps focus between the first and last focusable element of the card (the same technique `ImageEditor` already uses); `inert` on the page behind is not used (it would touch host markup and the editor stays host-independent). `aria-modal` and the role are applied only while `full`, so the normal card keeps its current semantics.

### D6. Host independence
All of it lives in `src/components/editor/` and `rich-editor.css`. The blog host (`BlogEditor.tsx`), its title, tags, counters and Save button are untouched and simply sit under the fixed card while it is on.

## Risks / Trade-offs

- **No Save while full screen.** The save button belongs to the host and is covered by the card; an author must leave full screen to save (the text survives, per the spec scenario). A host-provided action slot is possible later but is out of scope; the PO should know.
- **iOS virtual keyboard:** `100dvh` follows the browser bars but not always the on-screen keyboard, so the caret could sit under the keyboard on a phone until the page scrolls it into view; the text area scrolls inside, and the Builder reports what they could and could not check on a real or emulated phone.
- **Containing-block assumption** (D1) if a future wrapper adds `transform`.
- **Focus trap** is a small custom one; a Tester keyboard scenario covers Tab and Shift+Tab at both ends.

## Migration

None; nothing stored, no API change.

## Open questions

None for the owner. For the PO: confirm the "no Save while full screen" consequence is acceptable (assumption in the proposal says title and tags are not shown; Save is covered too).
