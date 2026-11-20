## ADDED Requirements

### Requirement: Distraction-free editor canvas
The post editor SHALL present a large title field and a serif body on a calm canvas. Formatting controls SHALL appear in a floating toolbar when text is selected, offering bold, italic, link, heading, block quote, list and alignment. On an empty line the editor SHALL offer a "+" menu to insert an image, a horizontal rule, a list or a block quote. These controls SHALL be usable by keyboard and by touch, and every format and limit that the editor supported before SHALL remain available and enforced.

#### Scenario: Floating toolbar on selection
- **WHEN** an author selects text in the editor
- **THEN** a toolbar appears next to the selection with the formatting controls, and applying one formats the selected text

#### Scenario: Insert menu on an empty line
- **WHEN** an author places the cursor on an empty line
- **THEN** a "+" control appears that opens the insert menu, and choosing an item inserts it at that line

#### Scenario: Keyboard and touch
- **WHEN** an author uses only the keyboard, or a touch screen
- **THEN** the floating toolbar and the insert menu can be opened and used

#### Scenario: Existing content and limits
- **WHEN** an author opens a post written before this change
- **THEN** it opens without loss, and character and image limits are still enforced

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

### Requirement: Likes, bookmarks and comments
A signed-in user SHALL be able to like a post, bookmark a post and comment on it, each only on a published post. A like and a bookmark SHALL be a toggle (one per user per post). A comment SHALL be plain text within a configured length limit, flat (no replies). Counts and comments SHALL be visible to every visitor, including anonymous ones, who SHALL be invited to sign in to act. A user SHALL be able to remove their own like, bookmark and comments. The post's author and the admin SHALL be able to remove any comment on that post. Every write SHALL be validated and rate-limited on the server, and no public response SHALL contain an email address or another private field.

#### Scenario: Like toggles
- **WHEN** a signed-in user likes a post twice
- **THEN** the second action removes the like, and the like count is the number of users currently liking it

#### Scenario: Anonymous reader
- **WHEN** an anonymous visitor opens a published post
- **THEN** counts and comments are shown, and the like, bookmark and comment controls ask them to sign in

#### Scenario: Comment
- **WHEN** a signed-in user submits a valid comment on a published post
- **THEN** it appears on the post with their display name and date, and an over-length or empty comment is refused with a clear message and nothing is stored

#### Scenario: Comment removal
- **WHEN** the post's author, the admin, or the comment's writer removes a comment
- **THEN** it disappears from the post; a different signed-in user cannot remove it

#### Scenario: Bookmarks
- **WHEN** a signed-in user bookmarks a post
- **THEN** it appears in their bookmarks list, and removing the bookmark removes it from the list

#### Scenario: Unpublished post
- **WHEN** a post is unpublished or deleted
- **THEN** no one can like, bookmark or comment on it and it is not listed as a bookmark

#### Scenario: No private data
- **WHEN** any public engagement response is read
- **THEN** it contains no email address and no field beyond counts, comment text, display name and dates
