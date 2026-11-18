## MODIFIED Requirements

### Requirement: Blog editor for authors
A user holding `blog:write` SHALL be able to list, create, edit, publish, unpublish and delete their own posts at `/blog`. A post SHALL have a title, a rich-text body, images, tags and a draft or published state. The editor SHALL be a rich-text editor that shows formatting while typing and offers headings, bold, italic, underline, strikethrough, bulleted and numbered lists, block quotes, inline code, code blocks, links, horizontal rules, images and undo/redo, each also available by keyboard shortcut where one is conventional. Posts created before the rich-text editor SHALL open and render without loss.

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

## ADDED Requirements

### Requirement: Read-only post page
Every published post SHALL have a public read-only page, readable without a session, showing the title, author display name, published date, tags, formatted body and images. A draft, a deleted post and an unknown id SHALL be answered as not found, with no content. Post content SHALL NOT be able to run scripts or load remote resources. When the blog is off the page SHALL be not found.

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
- **WHEN** a post body contains a script, an HTML event handler or a remote image
- **THEN** none of it runs or loads on the post page

#### Scenario: Author views own post
- **WHEN** an author opens a post of theirs from their `/blog` list in view mode
- **THEN** they see the read-only rendering and an Edit action, and a draft is visible to them (and to the admin) only

### Requirement: Author display name
Public headers and the post page SHALL show the author's display name and SHALL NOT expose the author's email address or any other account detail. A post whose author has no usable name SHALL show a neutral fallback name.

#### Scenario: Name on headers
- **WHEN** a visitor views the home headers or a post page
- **THEN** each shows the author's display name and no email address appears in the page or its public responses

## MODIFIED Requirements

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
