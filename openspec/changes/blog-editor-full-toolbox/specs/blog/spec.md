## ADDED Requirements

### Requirement: Tables
The editor SHALL let an author insert a table (3 by 3 with a header row), add and delete rows and columns, merge selected cells and split a merged cell, and delete the table. Cells SHALL hold plain text. A merged cell SHALL be stored as a column span and row span within a bounded size and rendered identically everywhere. Tables SHALL be stored with the post and rendered identically in the editor, the author's read-only view and the public post page.

#### Scenario: Insert and edit a table
- **WHEN** an author inserts a table, adds a row, types in cells, saves and reopens the post
- **THEN** the table, its extra row and the text are shown in the editor and on the public page

#### Scenario: Merge cells
- **WHEN** an author selects two adjacent cells, merges them, saves and reopens the post
- **THEN** the merged cell spans both columns in the editor and on the public page, and splitting it restores two cells

#### Scenario: Post without tables
- **WHEN** a post saved before this change is opened
- **THEN** it renders exactly as before

### Requirement: Task lists
The editor SHALL offer a task list whose items can be checked and unchecked while editing. The checked state SHALL be stored and shown read-only in the author's view and on the public page.

#### Scenario: Check an item
- **WHEN** an author checks one item of a task list, saves and reopens the post
- **THEN** that item is still checked, and the public page shows it checked without letting a reader change it

### Requirement: Subscript and superscript
The editor SHALL let an author mark text as subscript or superscript, shown in the editor, the author's view and the public page.

#### Scenario: Superscript
- **WHEN** an author makes a word superscript, saves and reopens the post
- **THEN** the word is still superscript in the editor and on the public page

### Requirement: Highlight and text color
The editor SHALL let an author highlight text or change its color from a preset palette or a free color choice, with a way to remove either. A stored color SHALL be exactly `#rrggbb`, any other value SHALL be refused on save, and a stored color SHALL never reach the page as free CSS text.

#### Scenario: Apply a preset color
- **WHEN** an author colors a word from the preset palette, saves and reopens the post
- **THEN** the word keeps that color in the editor and on the public page

#### Scenario: Apply a free color
- **WHEN** an author picks a custom color for a word, saves and reopens the post
- **THEN** the word keeps exactly that color in the editor and on the public page

#### Scenario: Invalid color value
- **WHEN** a save request contains a color or highlight value that is not a six-digit hexadecimal color
- **THEN** the save is refused with a message naming the attribute and value

### Requirement: Undo and redo controls
The editor SHALL offer undo and redo buttons that are disabled when there is nothing to undo or redo, in addition to the keyboard shortcuts.

#### Scenario: Undo a change
- **WHEN** an author types text and presses the undo button
- **THEN** the text is removed and the redo button becomes enabled

### Requirement: Image drop, paste and multi-upload
The editor SHALL upload images dropped onto it, pasted from the clipboard, or chosen in the picker (several files at once), through the existing secure upload path and insert each at the drop or cursor position. Each upload SHALL show progress, and a failure (type, size, per-post limit, network) SHALL show a clear message without losing the post text. Existing type, size and count limits SHALL still apply, and a never-saved post SHALL first be saved as a draft as it is today.

#### Scenario: Drop two images
- **WHEN** an author drops two valid images onto the editor
- **THEN** both upload with visible progress and appear at the drop position

#### Scenario: Paste an image
- **WHEN** an author pastes an image from the clipboard
- **THEN** it uploads and appears at the cursor

#### Scenario: Rejected file
- **WHEN** an author drops a file that is not an allowed image type or exceeds the size limit
- **THEN** a message names the file and the reason, nothing is inserted and the text is intact

### Requirement: Image editing
A selected image SHALL offer editing in the editor: crop to a rectangle, rotate by 90 degrees, flip horizontally and vertically, and reset to the original. Applying an edit SHALL produce a new image through the existing secure upload path (same type, size and count limits) and replace the image in the post; the original SHALL stay available through Reset until the post is saved, and a failed edit SHALL leave the image unchanged.

#### Scenario: Crop an image
- **WHEN** an author crops an uploaded image and applies the edit
- **THEN** the post shows the cropped image in the editor and, after saving, on the public page

#### Scenario: Edit fails
- **WHEN** applying an edit fails (limit, network or unsupported image)
- **THEN** a message explains why and the image is unchanged

### Requirement: Reusable editor
The rich-text editor SHALL be a host-independent component, so that other documentation surfaces can use the same editor with their own storage and image endpoints, without a copy of its code. The blog SHALL be its first host with no change in behavior beyond this change.

#### Scenario: Blog uses the shared editor
- **WHEN** an author writes a post
- **THEN** the blog uses the shared editor component and all existing blog scenarios still pass

### Requirement: Image size, alignment, alt text and caption
A selected image SHALL offer a size (small, medium, full width), an alignment (left, center, right), editable alt text and an optional caption separate from the alt text. Values SHALL be whitelisted identifiers stored with the image and rendered in the editor, the author's view and the public page; a value outside the whitelist SHALL be refused on save. An image with none of these set SHALL render as before.

#### Scenario: Resize and align
- **WHEN** an author sets an image to small and right-aligned, saves and reopens the post
- **THEN** the image is small and right-aligned in the editor and on the public page

#### Scenario: Alt text and caption differ
- **WHEN** an author sets alt text and a different caption
- **THEN** the image keeps the alt text as its description and shows the caption beneath it

## MODIFIED Requirements

### Requirement: Blog editor for authors
A user holding `blog:write` SHALL be able to list, create, edit, publish, unpublish and delete their own posts at `/blog`. A post SHALL have a title, a rich-text body, inline images, tags and a draft or published state. The editor SHALL be a rich-text editor that shows formatting while typing and offers headings, bold, italic, underline, strikethrough, bulleted and numbered lists, task lists, tables, block quotes, inline code, code blocks, links, highlight, text color, subscript, superscript, horizontal rules, images and undo/redo, each also available by keyboard shortcut where one is conventional. Posts created before the rich-text editor SHALL open and render without loss.

#### Scenario: Create and publish
- **WHEN** an author creates a post with a title and body and publishes it
- **THEN** the post appears in their list as published

#### Scenario: Draft stays private
- **WHEN** an author saves a post as a draft
- **THEN** it appears only in their list (and to the admin) and not on the home page or the public post page

#### Scenario: Delete
- **WHEN** an author deletes their post
- **THEN** it and its images no longer appear anywhere

#### Scenario: Images and tags
- **WHEN** an author adds an image and tags to a post
- **THEN** the post stores them and the editor shows them again on reopening

#### Scenario: Formatting while typing
- **WHEN** an author applies bold, a heading, a list and a link in the editor
- **THEN** the text is shown formatted in the editor, and reopening the post shows the same formatting

#### Scenario: Earlier post
- **WHEN** an author opens a post that was written before the rich-text editor
- **THEN** its content and formatting are intact in the editor and on the post page
