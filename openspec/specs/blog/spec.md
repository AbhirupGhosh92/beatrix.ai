# blog Specification

## Purpose
TBD - created by archiving change personal-blog. Update Purpose after archive.

## Requirements

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

### Requirement: Per-author ownership
Every post SHALL belong to the verified account that created it. An author SHALL read, edit and delete only their own posts; a request for another author's post SHALL be answered as not found. The admin SHALL be able to view, edit and delete any author's posts. No other role SHALL. This SHALL be enforced on the server, not only in the UI.

#### Scenario: Author opens another author's post
- **WHEN** an author with `blog:write` who is not admin requests another author's post
- **THEN** the response is not found and no content is returned

#### Scenario: Admin edits another author's post
- **WHEN** the admin opens and saves another author's post
- **THEN** the change is stored and the post keeps its original author

#### Scenario: Listing
- **WHEN** a non-admin author lists posts
- **THEN** only their own posts are returned

### Requirement: Private storage
Posts and images SHALL be stored where browsers have no direct access. Every read and write SHALL pass through the site's server and the private functions, which verify the session.

#### Scenario: Direct access
- **WHEN** a browser requests a stored post or image directly from storage
- **THEN** access is denied

### Requirement: Public home sample
The home page SHALL show a random sample of published posts from all authors as headers (title, author name, date, excerpt, tags), each opening that post's read-only page. Drafts SHALL never be included. The sample size SHALL come from the blog config. With no published posts, or with the section off, the block SHALL NOT render. A post that was unpublished or deleted MAY still appear on the home page for up to 30 seconds (the server keeps the pool of published headers for that long); after that it SHALL NOT.

#### Scenario: Random sample
- **WHEN** an anonymous visitor opens `/` and more published posts exist than the sample size
- **THEN** they see that many headers chosen at random, all published, each with its author name

#### Scenario: Opening a header
- **WHEN** a visitor clicks a header
- **THEN** they land on that post's read-only page

#### Scenario: Nothing to show
- **WHEN** there are no published posts
- **THEN** the home page shows no blog block and no empty frame

### Requirement: Section controlled by config
A config file `blog-config.json`, edited in the admin CMS with the example as per-key fallback, SHALL switch the blog on or off and hold its limits and the roles that hold `blog:write`. An invalid value SHALL be replaced by the example's so the site always works.

#### Scenario: Section off
- **WHEN** the config turns the blog off
- **THEN** `/blog` and its API answer not found for every role and the home block is hidden

#### Scenario: Invalid config
- **WHEN** the stored config has an invalid limit or role list
- **THEN** the example's values are used and the site renders

### Requirement: Limits
Title length, body length, tags per post, tag length and excerpt length SHALL be bounded by values in the blog config expressed in characters (not bytes), and the editor SHALL show a live count against each text limit. Image size SHALL remain bounded in bytes, and image count per post by number. A request over a limit SHALL be refused with a clear message stating the limit in the same unit and store nothing. A blog config that still uses the former byte-based body limit SHALL keep working with safe, documented behavior.

#### Scenario: Oversized image
- **WHEN** an author uploads an image over the limit
- **THEN** it is refused and the post is unchanged

#### Scenario: Live character counters
- **WHEN** an author types in the title or body
- **THEN** the editor shows "n / max characters" for it, updating as they type

#### Scenario: Over a text limit
- **WHEN** an author saves a title, body or tag longer than its character limit
- **THEN** the save is refused with a message naming the limit in characters and nothing is stored

#### Scenario: Old byte-based config
- **WHEN** the stored blog config still has the former byte-based body limit
- **THEN** the site works and the body limit in characters is a safe value derived from it or the default

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

### Requirement: Author display name
Public headers and the post page SHALL show the author's display name and SHALL NOT expose the author's email address or any other account detail. A post whose author has no usable name SHALL show a neutral fallback name.

#### Scenario: Name on headers
- **WHEN** a visitor views the home headers or a post page
- **THEN** each shows the author's display name and no email address appears in the page or its public responses

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

### Requirement: Distraction-free editor canvas
The post editor SHALL present a large title field and a serif body on a calm canvas. Formatting controls SHALL appear in a floating toolbar when text is selected, offering bold, italic, link, heading, block quote, list and alignment. Every format and limit the editor supported before SHALL remain available and enforced.

#### Scenario: Floating toolbar on selection
- **WHEN** an author selects text in the editor
- **THEN** a toolbar appears next to the selection with the formatting controls, and applying one formats the selected text

#### Scenario: Keyboard and touch
- **WHEN** an author uses only the keyboard, or a touch screen
- **THEN** the floating toolbar can be opened and used

#### Scenario: Existing content and limits
- **WHEN** an author opens a post written before this change
- **THEN** it opens without loss, and character and image limits are still enforced

### Requirement: Insert menu
On an empty line the editor SHALL offer a "+" menu to insert an image, a horizontal rule, a list or a block quote, usable by keyboard and by touch.

#### Scenario: Insert menu on an empty line
- **WHEN** an author places the cursor on an empty line
- **THEN** a "+" control appears that opens the insert menu, and choosing an item inserts it at that line

### Requirement: Reading layout
The public post page SHALL show the post in a narrow centered reading column in a serif body face, with a large title, the author name, publish date and an estimated read time, the tags, and image captions where an image has alt text. The reader theme and compact/stretch options SHALL keep working, and the layout SHALL fit widths from 320px upward in the light and dark themes.

#### Scenario: Byline
- **WHEN** a visitor opens a published post
- **THEN** the page shows the title, the author name, the publish date and an estimated read time

#### Scenario: Reader options kept
- **WHEN** a reader changes the theme or the compact/stretch option
- **THEN** the page follows the choice as before and remembers it in that browser

#### Scenario: Narrow screens
- **WHEN** the page is viewed at 320px wide
- **THEN** the text and images fit without horizontal scrolling

### Requirement: Likes and bookmarks
A signed-in user SHALL be able to like a post and bookmark a post, each only while it is published. A like and a bookmark SHALL each be a toggle, one per user per post. Counts SHALL be visible to every visitor, and anonymous visitors SHALL be invited to sign in to act. A user's bookmarks SHALL be listed for them.

#### Scenario: Like toggles
- **WHEN** a signed-in user likes a post twice
- **THEN** the second action removes the like, and the count is the number of users currently liking it

#### Scenario: Anonymous reader
- **WHEN** an anonymous visitor opens a published post
- **THEN** counts and comments are shown, and the like, bookmark and comment controls ask them to sign in

#### Scenario: Bookmarks
- **WHEN** a signed-in user bookmarks a post
- **THEN** it appears in their bookmarks list, and removing the bookmark removes it from the list

#### Scenario: Unpublished post
- **WHEN** a post is unpublished or deleted
- **THEN** no one can like, bookmark or comment on it and it is not listed as a bookmark

### Requirement: Comments
A signed-in user SHALL be able to comment on a published post. A comment SHALL be plain text within a configured length limit and flat (no replies), and SHALL be visible to every visitor. A user SHALL be able to remove their own comments, and the post's author and the admin SHALL be able to remove any comment on that post.

#### Scenario: Comment
- **WHEN** a signed-in user submits a valid comment on a published post
- **THEN** it appears on the post with their display name and date, and an over-length or empty comment is refused with a clear message and nothing is stored

#### Scenario: Comment removal
- **WHEN** the post's author, the admin, or the comment's writer removes a comment
- **THEN** it disappears from the post, and a different signed-in user cannot remove it

### Requirement: Engagement data is validated and public-safe
Every engagement write SHALL be validated and rate-limited on the server, and no public engagement response SHALL contain an email address or another private field.

#### Scenario: No private data
- **WHEN** any public engagement response is read
- **THEN** it contains no email address and no field beyond counts, comment text, display name and dates
