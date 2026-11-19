## ADDED Requirements

### Requirement: Text alignment
The editor SHALL let an author align paragraphs and headings left, center, right or justified, by toolbar control and by keyboard shortcut where the editor offers one. The alignment SHALL be stored with the post and SHALL be rendered identically in the editor, the author's read-only view and the public post page. A paragraph or heading with no stored alignment SHALL render as before.

#### Scenario: Align and reopen
- **WHEN** an author centers a heading, right-aligns a paragraph, saves and reopens the post
- **THEN** both blocks are still aligned that way in the editor

#### Scenario: Alignment in the reader
- **WHEN** a published post with aligned blocks is opened on its public page
- **THEN** each block is aligned as the author set it

#### Scenario: Post without alignment
- **WHEN** a post saved before this change is opened in the editor or on the public page
- **THEN** it renders exactly as before

### Requirement: List styling
The editor SHALL let an author choose a marker style for a bulleted list (disc, circle or square) and a numbering style for a numbered list (decimal, lower or upper alpha, lower or upper roman). The choice SHALL be stored with the post and SHALL be rendered in the editor, the author's read-only view and the public post page. A list with no stored style SHALL render as before.

#### Scenario: Style a bulleted list
- **WHEN** an author sets a bulleted list to square markers, saves and reopens the post
- **THEN** the list shows square markers in the editor and on the public page

#### Scenario: Style a numbered list
- **WHEN** an author sets a numbered list to roman numerals and saves
- **THEN** the list is numbered with roman numerals in the editor and on the public page

### Requirement: Accepted style values
Only the alignment and list-style values named in this capability SHALL be accepted when a post is saved and honored when it is rendered. Any other value SHALL be refused on save with a clear message and SHALL NOT affect rendering of an already stored post. Style values SHALL NOT be able to inject scripts, arbitrary CSS or remote resources.

#### Scenario: Unknown value on save
- **WHEN** a save request carries an alignment or list style outside the accepted values
- **THEN** it is refused, nothing is stored and the message says which value is not allowed

#### Scenario: No script through content
- **WHEN** post content is crafted to carry markup or style text in an alignment or list-style attribute
- **THEN** nothing executes and the public page shows no injected style or element

### Requirement: Reader display options
The read-only post views (the public post page and the author's read-only view) SHALL offer a reading theme (light, dark and a sepia paper theme) and a compact or stretched content width. With no saved choice, the theme SHALL follow the site theme and the width SHALL be compact. Both choices SHALL be remembered per browser, SHALL apply only to the reader's own view and SHALL NOT change the post. If browser storage is unavailable the controls SHALL still work for the current visit.

#### Scenario: Choose a theme
- **WHEN** a reader selects the sepia theme on a post page and later opens another post
- **THEN** the sepia theme is applied there too

#### Scenario: Stretch the width
- **WHEN** a reader switches from compact to stretched
- **THEN** the content uses the full available width, and the choice is kept on the next visit

#### Scenario: Storage unavailable
- **WHEN** the browser blocks storage and the reader changes the theme
- **THEN** the page changes theme for that visit and shows no error

#### Scenario: Reader choice does not alter the post
- **WHEN** a reader picks a theme and width
- **THEN** the stored post and what other readers see are unchanged

### Requirement: Image upload in the editor
An author SHALL be able to add an image from the editor by choosing a file: an allowed type within the configured size limit is uploaded, appears in the editor, is saved with the post and shows on the public page. A file of a wrong type or over the limit SHALL be refused with a clear message and SHALL store nothing. A failed upload SHALL show a message to the author.

#### Scenario: Upload an allowed image
- **WHEN** an author chooses a png within the size limit in the editor, saves and publishes
- **THEN** the image shows in the editor and on the public post page

#### Scenario: Wrong type or too large
- **WHEN** an author chooses a file that is not an allowed image type or is over the limit
- **THEN** the editor shows a clear message and nothing is stored

#### Scenario: Upload failure
- **WHEN** an upload fails for any reason
- **THEN** the author sees a message and the post content is unchanged
