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

### Requirement: Inline images
An author SHALL be able to place an image between paragraphs of a post, either by uploading an image file or by giving an https image URL (with optional alt text). The image SHALL appear at that position, as a block between the surrounding text, in the editor, the author's read-only view and the public post page. Uploaded images keep the existing type, size and count limits; a URL image SHALL be an absolute `https` URL within a length limit from the blog config.

#### Scenario: Upload between paragraphs
- **WHEN** an author uploads an allowed image within the size limit while the cursor is between two paragraphs, then saves and publishes
- **THEN** the image shows between those paragraphs in the editor and on the public post page

#### Scenario: Image by URL
- **WHEN** an author inserts an image by https URL between two paragraphs, saves and publishes
- **THEN** the image shows between those paragraphs in the editor and on the public post page

#### Scenario: URL not accepted
- **WHEN** an author gives an `http`, `javascript:`, `data:` or relative image URL, or one over the length limit
- **THEN** it is refused with a clear message and nothing is stored

#### Scenario: Wrong type or too large
- **WHEN** an author uploads a file that is not an allowed image type or is over the size limit
- **THEN** a clear message is shown and nothing is stored

#### Scenario: Image cannot load
- **WHEN** an image URL in a post cannot be fetched by the reader's browser
- **THEN** the alt text is shown in its place and the text around it is unaffected

### Requirement: Upload on a new post
The image control in the editor SHALL always be usable. When the post has never been saved, using it SHALL first save the post as a draft and then open the file picker; if that save fails (for example the title is missing) the author SHALL see the reason and no file picker opens. An upload that fails SHALL show a clear message and leave the post content unchanged.

#### Scenario: First upload on a new post
- **WHEN** an author with a titled, unsaved post clicks the image control
- **THEN** the post is saved as a draft, the file picker opens, and the chosen image is added to the post

#### Scenario: Unsaved post cannot be saved
- **WHEN** an author with an untitled new post clicks the image control
- **THEN** a message explains what is missing and no draft is created

#### Scenario: Upload failure
- **WHEN** an upload fails for any reason
- **THEN** the author sees a message and the post content is unchanged

## MODIFIED Requirements

### Requirement: Blog editor for authors
A user holding `blog:write` SHALL be able to list, create, edit, publish, unpublish and delete their own posts at `/blog`. A post SHALL have a title, a rich-text body, inline images, tags and a draft or published state. The editor SHALL be a rich-text editor that shows formatting while typing and offers headings, bold, italic, underline, strikethrough, bulleted and numbered lists, block quotes, inline code, code blocks, links, horizontal rules, images and undo/redo, each also available by keyboard shortcut where one is conventional. Posts created before the rich-text editor SHALL open and render without loss.

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

### Requirement: Read-only post page
Every published post SHALL have a public read-only page, readable without a session, showing the title, author display name, published date, tags, formatted body and images. A draft, a deleted post and an unknown id SHALL be answered as not found, with no content. Post content SHALL NOT be able to run scripts, and the only remote resource it may load is an image from an `https` URL placed as an image block by the author. When the blog is off the page SHALL be not found.

#### Scenario: Reading a published post
- **WHEN** a visitor opens the page of a published post
- **THEN** they see its title, author name, date, tags, formatting and images, with no editing controls

#### Scenario: Draft or unknown post
- **WHEN** a visitor opens the page of a draft, a deleted post or an unknown id
- **THEN** the response is not found and no post content is returned

#### Scenario: Recently unpublished post
- **WHEN** a post was unpublished or deleted less than 30 seconds ago
- **THEN** its page MAY still be readable (the server caches published posts for 30 seconds), and after that it is not found

#### Scenario: Hostile content
- **WHEN** a post body contains a script, an HTML event handler, or an image that is not an uploaded image or an https image block
- **THEN** none of it runs or loads on the post page

#### Scenario: Author views own post
- **WHEN** an author opens a post of theirs from their `/blog` list in view mode
- **THEN** they see the read-only rendering and an Edit action, and a draft is visible to them (and to the admin) only
